import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { 
  Mail, 
  Search, 
  Bell, 
  User, 
  Settings, 
  Plus, 
  Check, 
  Info, 
  AlertTriangle 
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { Checkbox } from '@/components/ui/Checkbox';
import { Switch } from '@/components/ui/Switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Progress } from '@/components/ui/Progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent, AccordionRoot } from '@/components/ui/Accordion';
import { Select, SelectItem } from '@/components/ui/Select';
import { KeyboardResponsiveView } from '@/components/ui/KeyboardResponsiveView';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/use-theme';

const { width } = Dimensions.get('window');

export default function UIGallery() {
  const { colors, toggleTheme, theme } = useTheme();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0.4);

  return (
    <KeyboardResponsiveView 
      style={{ backgroundColor: colors.background }} 
      contentContainerStyle={styles.container}
    >
      <Stack.Screen options={{ title: 'UI Gallery', headerShown: true }} />
      
      <View style={styles.header}>
        <Typography.H1>UI Kit</Typography.H1>
        <Typography.P style={{ color: colors.mutedForeground }}>
          Complete component library for AgriNexa
        </Typography.P>
        <Button 
          variant="outline" 
          onPress={toggleTheme} 
          style={{ marginTop: 10 }}
        >
          Active Theme: {theme.toUpperCase()}
        </Button>
      </View>

      <Section title="Typography">
        <Typography.H1>Heading 1</Typography.H1>
        <Typography.H2>Heading 2</Typography.H2>
        <Typography.H3>Heading 3</Typography.H3>
        <Typography.P>This is a standard paragraph showing off the text clarity and spacing.</Typography.P>
        <Typography.Lead>Lead text for prominent descriptions.</Typography.Lead>
        <Typography.Muted>Muted text for less important details.</Typography.Muted>
      </Section>

      <Section title="Buttons & Badges">
        <View style={styles.row}>
          <Button onPress={() => toast({ title: 'Default Button', description: 'You clicked me!', type: 'info' })}>
            Primary
          </Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
        </View>
        <View style={styles.row}>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </View>
        <View style={styles.row}>
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </View>
      </Section>

      <Section title="Forms">
        <Input 
          placeholder="Standard Input" 
          leftIcon={<Mail size={20} color={colors.mutedForeground} />}
          clearable
        />
        <Input 
          placeholder="With Error" 
          error 
          defaultValue="invalid input"
        />
        <View style={styles.row}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Checkbox />
            <Typography.Small>Checkbox</Typography.Small>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Switch />
            <Typography.Small>Switch</Typography.Small>
          </View>
        </View>
        <RadioGroup>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <RadioGroupItem value="1" />
            <Typography.Small>Option 1</Typography.Small>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <RadioGroupItem value="2" />
            <Typography.Small>Option 2</Typography.Small>
          </View>
        </RadioGroup>
      </Section>

      <Section title="Cards">
        <Card>
          <CardHeader>
            <CardTitle>Project Update</CardTitle>
            <CardDescription>View your latest farm statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <Typography.P>Your crops are healthy and the soil moisture is optimal.</Typography.P>
            <Progress value={progress} style={{ marginTop: 16 }} />
          </CardContent>
          <CardFooter style={{ justifyContent: 'space-between' }}>
            <Button variant="ghost" size="sm">Dismiss</Button>
            <Button size="sm">Details</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Navigation & Overlays">
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <Typography.P style={{ marginTop: 10 }}>Account settings and profile info.</Typography.P>
          </TabsContent>
          <TabsContent value="password">
            <Typography.P style={{ marginTop: 10 }}>Change your security preferences here.</Typography.P>
          </TabsContent>
        </Tabs>
        
        <Separator style={{ marginVertical: 20 }} />

        <AccordionRoot>
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it responsive?</AccordionTrigger>
            <AccordionContent>
              <Typography.P>Yes, every component is designed for multiple screen sizes.</Typography.P>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Can I theme it?</AccordionTrigger>
            <AccordionContent>
              <Typography.P>Absolutely. It supports light/dark modes and custom tokens.</Typography.P>
            </AccordionContent>
          </AccordionItem>
        </AccordionRoot>
      </Section>

      <Section title="Interactive">
        <Select placeholder="Select a crop" onValueChange={(val) => toast({ title: 'Selected', description: val })}>
          <SelectItem value="rice">Rice</SelectItem>
          <SelectItem value="tomato">Tomato</SelectItem>
          <SelectItem value="maize">Maize</SelectItem>
        </Select>
      </Section>

      <View style={{ height: 100 }} />
    </KeyboardResponsiveView>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Typography.H3 style={styles.sectionTitle}>{title}</Typography.H3>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    marginBottom: 8,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    marginBottom: 16,
    opacity: 0.8,
  },
  sectionContent: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
