import asyncio
import datetime as dt
import json
import logging
from typing import Any, Dict, List, Optional, Tuple, Union
import asyncpg

from app.core.config import settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


def _normalize_value_for_col(v: Any, col_type: Optional[str]) -> Any:
    if v is None:
        return None
    if col_type == "jsonb":
        return json.dumps(v, default=str) if not isinstance(v, str) else v
    if col_type in ("text", "character varying", "varchar") and isinstance(v, (dt.datetime, dt.date)):
        return v.isoformat()
    return v



def get_clean_dsn() -> str:
    raw_dsn = settings.database_url or settings.postgres_url or ""
    # Remove unsupported asyncpg parameters like channel_binding
    clean = raw_dsn.replace("&channel_binding=require", "").replace("channel_binding=require&", "")
    return clean


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        dsn = get_clean_dsn()
        if not dsn:
            raise RuntimeError("DATABASE_URL is not configured.")
        _pool = await asyncpg.create_pool(
            dsn,
            min_size=1,
            max_size=10,
            command_timeout=60,
        )
    return _pool


class AsyncCursor:
    def __init__(self, table: 'PostgresTable', filter_dict: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None):
        self.table = table
        self.filter_dict = filter_dict or {}
        self.projection = projection
        self._sort_params: List[Tuple[str, int]] = []
        self._skip: int = 0
        self._limit: Optional[int] = None

    def sort(self, key_or_list: Union[str, List[Tuple[str, int]]], direction: int = 1) -> 'AsyncCursor':
        if isinstance(key_or_list, list):
            self._sort_params.extend(key_or_list)
        elif isinstance(key_or_list, str):
            self._sort_params.append((key_or_list, direction))
        return self

    def skip(self, n: int) -> 'AsyncCursor':
        self._skip = max(0, n)
        return self

    def limit(self, n: int) -> 'AsyncCursor':
        self._limit = max(0, n)
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        limit = length if length is not None else self._limit
        return await self.table._execute_query(
            self.filter_dict,
            projection=self.projection,
            sort=self._sort_params,
            skip=self._skip,
            limit=limit,
        )

    def __aiter__(self):
        self._items = None
        self._idx = 0
        return self

    async def __anext__(self):
        if self._items is None:
            self._items = await self.to_list()
        if self._idx < len(self._items):
            item = self._items[self._idx]
            self._idx += 1
            return item
        raise StopAsyncIteration


class InsertResult:
    def __init__(self, inserted_id: Any):
        self.inserted_id = inserted_id


class UpdateResult:
    def __init__(self, modified_count: int):
        self.modified_count = modified_count


class DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class PostgresTable:
    def __init__(self, name: str):
        self.name = name

    def _deserialize_row(self, row: asyncpg.Record) -> Dict[str, Any]:
        data = dict(row)
        # Parse JSON fields if necessary
        for k, v in list(data.items()):
            if isinstance(v, str) and (v.startswith("{") or v.startswith("[")):
                try:
                    data[k] = json.loads(v)
                except Exception:
                    pass
        # If table has a dedicated 'data' or 'extra_data' JSONB column, unpack it
        json_col = "data" if "data" in data else ("extra_data" if "extra_data" in data else None)
        if json_col and isinstance(data[json_col], dict):
            extra = data.pop(json_col)
            for ek, ev in extra.items():
                if ek not in data:
                    data[ek] = ev
        # Provide _id compatibility for legacy document keys
        if "_id" not in data:
            data["_id"] = data.get("user_id") or data.get("conversation_id") or data.get("message_id") or data.get("plan_id") or data.get("id")
        return data

    @staticmethod
    def _build_filter_conditions(
        filter_dict: Dict[str, Any],
        valid_cols: Optional[Dict[str, str]] = None,
        start_idx: int = 1,
    ) -> tuple[list[str], list[Any], int]:
        where_clauses: list[str] = []
        params: list[Any] = []
        idx = start_idx

        json_col = "data" if (valid_cols and "data" in valid_cols) else ("extra_data" if (valid_cols and "extra_data" in valid_cols) else None)

        for raw_k, v in (filter_dict or {}).items():
            k = raw_k
            # Map legacy document key "_id" to table's primary key column if "_id" is not a column
            if k == "_id" and valid_cols and "_id" not in valid_cols:
                for candidate in ["plan_id", "user_id", "conversation_id", "message_id", "id"]:
                    if candidate in valid_cols:
                        k = candidate
                        break

            if k == "$or" and isinstance(v, list):
                or_clauses: list[str] = []
                for sub in v:
                    for sub_k, sub_v in sub.items():
                        actual_sub_k = sub_k
                        if actual_sub_k == "_id" and valid_cols and "_id" not in valid_cols:
                            for candidate in ["plan_id", "user_id", "conversation_id", "message_id", "id"]:
                                if candidate in valid_cols:
                                    actual_sub_k = candidate
                                    break
                        col_ref = actual_sub_k
                        val_to_use = sub_v
                        if valid_cols and actual_sub_k not in valid_cols and json_col:
                            col_ref = f"{json_col}->>'{actual_sub_k}'"
                            val_to_use = str(sub_v)
                        or_clauses.append(f"{col_ref} = ${idx}")
                        params.append(val_to_use)
                        idx += 1
                if or_clauses:
                    where_clauses.append(f"({' OR '.join(or_clauses)})")
            elif k.startswith("tasks."):
                target_json_col = json_col or "data"
                where_clauses.append(f"{target_json_col}->'tasks' @> ${idx}::jsonb")
                params.append(json.dumps([{"task_id": v}], default=str))
                idx += 1
            else:
                is_json_fallback = valid_cols is not None and k not in valid_cols and json_col is not None
                col_expr = f"{json_col}->>'{k}'" if is_json_fallback else k
                col_type = valid_cols.get(k) if valid_cols else None

                if isinstance(v, dict):
                    if "$ne" in v:
                        target = _normalize_value_for_col(v["$ne"], col_type) if not is_json_fallback else v["$ne"]
                        if is_json_fallback:
                            where_clauses.append(f"({col_expr} IS NULL OR {col_expr} != ${idx}::text)")
                            params.append(str(target))
                        else:
                            where_clauses.append(f"({col_expr} IS NULL OR {col_expr} != ${idx})")
                            params.append(target)
                        idx += 1
                    elif "$in" in v and isinstance(v["$in"], list):
                        in_vals = v["$in"]
                        if not in_vals:
                            where_clauses.append("1=0")
                        else:
                            placeholders = [f"${idx + i}" for i in range(len(in_vals))]
                            if is_json_fallback:
                                placeholders = [f"{p}::text" for p in placeholders]
                                params.extend(str(item) for item in in_vals)
                            else:
                                params.extend([_normalize_value_for_col(item, col_type) for item in in_vals])
                            where_clauses.append(f"{col_expr} IN ({', '.join(placeholders)})")
                            idx += len(in_vals)
                    elif "$lt" in v:
                        target = _normalize_value_for_col(v["$lt"], col_type) if not is_json_fallback else v["$lt"]
                        where_clauses.append(f"{col_expr} < ${idx}")
                        params.append(str(target) if is_json_fallback else target)
                        idx += 1
                    elif "$gt" in v:
                        target = _normalize_value_for_col(v["$gt"], col_type) if not is_json_fallback else v["$gt"]
                        where_clauses.append(f"{col_expr} > ${idx}")
                        params.append(str(target) if is_json_fallback else target)
                        idx += 1
                    elif "$lte" in v:
                        target = _normalize_value_for_col(v["$lte"], col_type) if not is_json_fallback else v["$lte"]
                        where_clauses.append(f"{col_expr} <= ${idx}")
                        params.append(str(target) if is_json_fallback else target)
                        idx += 1
                    elif "$gte" in v:
                        target = _normalize_value_for_col(v["$gte"], col_type) if not is_json_fallback else v["$gte"]
                        where_clauses.append(f"{col_expr} >= ${idx}")
                        params.append(str(target) if is_json_fallback else target)
                        idx += 1
                    else:
                        where_clauses.append(f"{col_expr} = ${idx}")
                        params.append(_normalize_value_for_col(v, col_type))
                        idx += 1
                else:
                    if is_json_fallback and isinstance(v, bool):
                        where_clauses.append(f"({col_expr})::boolean = ${idx}")
                        params.append(v)
                    elif is_json_fallback:
                        where_clauses.append(f"{col_expr} = ${idx}::text")
                        params.append(str(v))
                    else:
                        where_clauses.append(f"{col_expr} = ${idx}")
                        params.append(_normalize_value_for_col(v, col_type))
                    idx += 1

        return where_clauses, params, idx

    async def _execute_query(
        self,
        filter_dict: Dict[str, Any],
        projection: Optional[Dict[str, Any]] = None,
        sort: Optional[List[Tuple[str, int]]] = None,
        skip: int = 0,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            cols_info = await conn.fetch(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
                self.name,
            )
            valid_cols = {r["column_name"]: r["data_type"] for r in cols_info}
            where_clauses, params, _ = self._build_filter_conditions(filter_dict, valid_cols=valid_cols, start_idx=1)

            sql = f"SELECT * FROM {self.name}"
            if where_clauses:
                sql += f" WHERE {' AND '.join(where_clauses)}"

            if sort:
                order_by = []
                for col, d in sort:
                    direction_str = "ASC" if d == 1 else "DESC"
                    order_by.append(f"{col} {direction_str}")
                sql += f" ORDER BY {', '.join(order_by)}"

            if limit is not None:
                sql += f" LIMIT {limit}"
            if skip > 0:
                sql += f" OFFSET {skip}"

            try:
                rows = await conn.fetch(sql, *params)
                return [self._deserialize_row(r) for r in rows]
            except Exception as e:
                logger.warning(f"Error executing query on {self.name}: {e} (SQL: {sql})")
                return []

    async def find_one(
        self,
        filter_dict: Dict[str, Any],
        projection: Optional[Dict[str, Any]] = None,
        sort: Optional[List[Tuple[str, int]]] = None,
    ) -> Optional[Dict[str, Any]]:
        results = await self._execute_query(filter_dict, projection=projection, sort=sort, limit=1)
        return results[0] if results else None

    def find(self, filter_dict: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> AsyncCursor:
        return AsyncCursor(self, filter_dict=filter_dict, projection=projection)

    async def insert_one(self, doc: Dict[str, Any]) -> InsertResult:
        pool = await get_pool()
        doc_copy = dict(doc)
        doc_copy.pop("_id", None)

        async with pool.acquire() as conn:
            cols_info = await conn.fetch(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
                self.name,
            )
            valid_cols = {r["column_name"]: r["data_type"] for r in cols_info}

            row_data = {}
            extra_data = {}

            json_col = "data" if "data" in valid_cols else ("extra_data" if "extra_data" in valid_cols else None)

            for k, v in doc_copy.items():
                if k in valid_cols:
                    row_data[k] = _normalize_value_for_col(v, valid_cols[k])
                else:
                    extra_data[k] = v

            if json_col and extra_data:
                row_data[json_col] = json.dumps(extra_data, default=str)

            keys = list(row_data.keys())
            values = list(row_data.values())
            placeholders = [f"${i+1}" for i in range(len(keys))]

            sql = f"INSERT INTO {self.name} ({', '.join(keys)}) VALUES ({', '.join(placeholders)})"

            # Handle upserts on primary keys
            if self.name == "users" and "user_id" in row_data:
                update_items = [f"{k} = EXCLUDED.{k}" for k in keys if k != "user_id"]
                if update_items:
                    sql += f" ON CONFLICT (user_id) DO UPDATE SET {', '.join(update_items)}"
            elif self.name == "otps" and "identifier" in row_data and "purpose" in row_data:
                sql += " ON CONFLICT (identifier, purpose) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at"
            elif self.name == "agri_flow_plans" and "plan_id" in row_data:
                sql += " ON CONFLICT (plan_id) DO UPDATE SET data = EXCLUDED.data, status = EXCLUDED.status, updated_at = NOW()"
            elif self.name == "chat_conversations" and "conversation_id" in row_data:
                update_items = [f"{k} = EXCLUDED.{k}" for k in keys if k != "conversation_id"]
                if update_items:
                    sql += f" ON CONFLICT (conversation_id) DO UPDATE SET {', '.join(update_items)}"
            elif self.name == "chat_messages" and "message_id" in row_data:
                update_items = [f"{k} = EXCLUDED.{k}" for k in keys if k != "message_id"]
                if update_items:
                    sql += f" ON CONFLICT (message_id) DO UPDATE SET {', '.join(update_items)}"

            try:
                await conn.execute(sql, *values)
            except Exception as e:
                logger.error(f"Error inserting into {self.name}: {e} (SQL: {sql})")

        inserted_id = doc.get("user_id") or doc.get("conversation_id") or doc.get("plan_id") or doc.get("message_id")
        return InsertResult(inserted_id)

    async def update_one(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any], upsert: bool = False) -> UpdateResult:
        pool = await get_pool()
        set_updates = dict(update_dict.get("$set", {}))
        push_updates = dict(update_dict.get("$push", {}))

        async with pool.acquire() as conn:
            # Handle special upsert for OTPs
            if upsert and self.name == "otps" and "identifier" in filter_dict and "purpose" in filter_dict:
                otp_val = set_updates.get("otp", "")
                exp_val = float(set_updates.get("expires_at", 0))
                await conn.execute("""
                    INSERT INTO otps (identifier, purpose, otp, expires_at)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (identifier, purpose) DO UPDATE SET otp = $3, expires_at = $4
                """, filter_dict["identifier"], filter_dict["purpose"], otp_val, exp_val)
                return UpdateResult(1)

            cols_info = await conn.fetch(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
                self.name,
            )
            valid_cols = {r["column_name"]: r["data_type"] for r in cols_info}

            json_col = "data" if "data" in valid_cols else ("extra_data" if "extra_data" in valid_cols else None)

            assignments = []
            params = []
            idx = 1

            direct_json_col_val = None
            if json_col and json_col in set_updates:
                direct_json_col_val = set_updates.pop(json_col)

            extra_json = {}
            for k, v in set_updates.items():
                if k in valid_cols:
                    col_type = valid_cols[k]
                    val_norm = _normalize_value_for_col(v, col_type)
                    if col_type == "jsonb":
                        assignments.append(f"{k} = ${idx}::jsonb")
                    else:
                        assignments.append(f"{k} = ${idx}")
                    params.append(val_norm)
                    idx += 1
                elif json_col:
                    extra_json[k] = v

            # Assemble single expression for json_col if needed
            json_expr_parts = []
            if json_col:
                if direct_json_col_val is not None:
                    if isinstance(direct_json_col_val, dict):
                        merged = dict(direct_json_col_val)
                        merged.update(extra_json)
                        json_expr_parts.append(f"${idx}::jsonb")
                        params.append(json.dumps(merged, default=str))
                        idx += 1
                        extra_json = {}
                    else:
                        json_expr_parts.append(f"${idx}::jsonb")
                        params.append(_normalize_value_for_col(direct_json_col_val, "jsonb"))
                        idx += 1

                if extra_json:
                    if not json_expr_parts:
                        json_expr_parts.append(f"COALESCE({json_col}, '{{}}'::jsonb)")
                    json_expr_parts.append(f"${idx}::jsonb")
                    params.append(json.dumps(extra_json, default=str))
                    idx += 1

            # Process $push
            for k, v in push_updates.items():
                if k in valid_cols and valid_cols[k] == "jsonb":
                    if isinstance(v, dict) and "$each" in v:
                        items = v["$each"]
                    else:
                        items = [v]
                    assignments.append(f"{k} = COALESCE({k}, '[]'::jsonb) || ${idx}::jsonb")
                    params.append(json.dumps(items, default=str))
                    idx += 1
                elif json_col:
                    if isinstance(v, dict) and "$each" in v:
                        items = v["$each"]
                    else:
                        items = [v]
                    if not json_expr_parts:
                        json_expr_parts.append(f"COALESCE({json_col}, '{{}}'::jsonb)")
                    json_expr_parts.append(
                        f"jsonb_build_object(${idx}::text, COALESCE({json_col}->${idx}::text, '[]'::jsonb) || ${idx+1}::jsonb)"
                    )
                    params.append(k)
                    params.append(json.dumps(items, default=str))
                    idx += 2

            if json_col and json_expr_parts:
                combined_expr = " || ".join(json_expr_parts)
                assignments.append(f"{json_col} = {combined_expr}")

            where_clauses, filter_params, _ = self._build_filter_conditions(filter_dict, valid_cols=valid_cols, start_idx=idx)
            params.extend(filter_params)

            if not assignments:
                return UpdateResult(0)

            sql = f"UPDATE {self.name} SET {', '.join(assignments)}"
            if where_clauses:
                sql += f" WHERE {' AND '.join(where_clauses)}"

            try:
                res = await conn.execute(sql, *params)
                count = int(res.split(" ")[-1]) if " " in res else 1
                if count == 0 and upsert:
                    doc_to_insert = dict(filter_dict)
                    doc_to_insert.update(set_updates)
                    if direct_json_col_val is not None:
                        doc_to_insert[json_col] = direct_json_col_val
                    await self.insert_one(doc_to_insert)
                    return UpdateResult(1)
                return UpdateResult(count)
            except Exception as e:
                logger.warning(f"Error updating {self.name}: {e} (SQL: {sql})")
                return UpdateResult(0)

    async def update_many(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any]) -> UpdateResult:
        return await self.update_one(filter_dict, update_dict)

    async def delete_one(self, filter_dict: Dict[str, Any]) -> DeleteResult:
        pool = await get_pool()
        async with pool.acquire() as conn:
            cols_info = await conn.fetch(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
                self.name,
            )
            valid_cols = {r["column_name"]: r["data_type"] for r in cols_info}
            where_clauses, params, _ = self._build_filter_conditions(filter_dict, valid_cols=valid_cols, start_idx=1)

            sql = f"DELETE FROM {self.name}"
            if where_clauses:
                sql += f" WHERE {' AND '.join(where_clauses)}"

            try:
                res = await conn.execute(sql, *params)
                count = int(res.split(" ")[-1]) if " " in res else 1
                return DeleteResult(count)
            except Exception as e:
                logger.warning(f"Error deleting from {self.name}: {e}")
                return DeleteResult(0)

    async def delete_many(self, filter_dict: Dict[str, Any]) -> DeleteResult:
        return await self.delete_one(filter_dict)

    async def count_documents(self, filter_dict: Dict[str, Any]) -> int:
        pool = await get_pool()
        async with pool.acquire() as conn:
            cols_info = await conn.fetch(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
                self.name,
            )
            valid_cols = {r["column_name"]: r["data_type"] for r in cols_info}
            where_clauses, params, _ = self._build_filter_conditions(filter_dict, valid_cols=valid_cols, start_idx=1)

            sql = f"SELECT COUNT(*) FROM {self.name}"
            if where_clauses:
                sql += f" WHERE {' AND '.join(where_clauses)}"

            try:
                return await conn.fetchval(sql, *params) or 0
            except Exception as e:
                logger.warning(f"Error counting in {self.name}: {e}")
                return 0

    async def create_index(self, *args, **kwargs):
        # Index creation handled by DDL
        return None


class PostgresClient:
    def __init__(self):
        class Admin:
            async def command(self, cmd: str):
                pool = await get_pool()
                async with pool.acquire() as conn:
                    await conn.fetchval("SELECT 1")
                return {"ok": 1}

        self.admin = Admin()

    def close(self):
        global _pool
        if _pool is not None:
            asyncio.create_task(_pool.close())
            _pool = None


class PostgresDB:
    def __init__(self):
        self._tables: Dict[str, PostgresTable] = {}

    def __getattr__(self, name: str) -> PostgresTable:
        if name not in self._tables:
            self._tables[name] = PostgresTable(name)
        return self._tables[name]

    def get_database(self, name: str) -> 'PostgresDB':
        return self

    async def execute(self, query: str, *args) -> str:
        pool = await get_pool()
        async with pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args) -> List[asyncpg.Record]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args) -> Optional[asyncpg.Record]:
        pool = await get_pool()
        async with pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetchval(self, query: str, *args) -> Any:
        pool = await get_pool()
        async with pool.acquire() as conn:
            return await conn.fetchval(query, *args)


client = PostgresClient()
db = PostgresDB()


async def get_db():
    return db


async def close_db() -> None:
    client.close()
