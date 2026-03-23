
import io

class DiseaseModel:
    def __init__(self):
        # In a real app, you would load a trained .pth or .h5 model here
        # self.model = torch.load('model.pth')
        # self.model.eval()
        self.classes = ['Healthy', 'Leaf Blight', 'Rust', 'Powdery Mildew', 'Caterpillar Damage', 'Downy Mildew', 'Leaf Spot', 'Mosaic Virus']

    def predict(self, image_bytes: bytes):
        import random
        disease = random.choice(self.classes[1:])
        confidence = random.uniform(0.85, 0.98)
        
        solutions = {
            'Leaf Blight': {
                'en': 'Use copper-based fungicides and improve air circulation.',
                'ta': 'தாமிரம் சார்ந்த பூஞ்சைக் கொல்லிகளைப் பயன்படுத்துங்கள் மற்றும் காற்று சுழற்சியை மேம்படுத்தவும்.'
            },
            'Rust': {
                'en': 'Apply sulfur dust or neem oil. Remove infected leaves.',
                'ta': 'கந்தகத் தூள் அல்லது வேப்ப எண்ணெய் தடவவும். பாதிக்கப்பட்ட இலைகளை அகற்றவும்.'
            },
            'Powdery Mildew': {
                'en': 'Use baking soda spray or potassium bicarbonate.',
                'ta': 'சமையல் சோடா ஸ்ப்ரே அல்லது பொட்டாசியம் பைகார்பனேட் பயன்படுத்தவும்.'
            },
            'Caterpillar Damage': {
                'en': 'Use Bacillus thuringiensis (Bt) or hand-pick pests.',
                'ta': 'பேசிலஸ் துரிஞ்சியென்சிஸ் (Bt) ஐப் பயன்படுத்தவும் அல்லது பூச்சிகளை கையால் எடுக்கவும்.'
            },
            'Downy Mildew': {
                'en': 'Apply Mancozeb or Ridomil Gold. Avoid overhead watering.',
                'ta': 'மேன்கோசெப் அல்லது ரிடோமில் கோல்ட் பயன்படுத்தவும். செடியின் மேல் நீர் பாய்ச்சுவதைத் தவிர்க்கவும்.'
            },
            'Leaf Spot': {
                'en': 'Remove infected debris and use Chlorothalonil fungicide.',
                'ta': 'பாதிக்கப்பட்ட இலைகளை அகற்றிவிட்டு குளோரோதலோனில் பூஞ்சைக் கொல்லியைப் பயன்படுத்தவும்.'
            },
            'Mosaic Virus': {
                'en': 'Control aphids and remove infected plants immediately.',
                'ta': 'அசுவினிப் பூச்சிகளைக் கட்டுப்படுத்தி, பாதிக்கப்பட்ட செடிகளை உடனடியாக அகற்றவும்.'
            }
        }
        
        sol = solutions.get(disease, {'en': 'Consult a local agri-expert.', 'ta': 'உள்ளூர் விவசாய நிபுணரை அணுகவும்.'})
        
        return {
            "disease": disease,
            "confidence": confidence,
            "solution": sol['en'],
            "tamil_solution": sol['ta']
        }

disease_model = DiseaseModel()
