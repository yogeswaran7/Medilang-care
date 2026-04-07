import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Translation strings
const translations: Record<string, Record<string, string>> = {
  en: {
    // Navigation
    scan: 'Scan',
    routine: 'Routine',
    profile: 'Profile',
    
    // Page 1 - Scan
    prescriptionScanner: 'Prescription Scanner',
    takePhoto: 'Take Photo',
    uploadFromGallery: 'Upload from Gallery',
    scanning: 'Scanning prescription...',
    analyzeImage: 'Analyze Prescription',
    scanSuccess: 'Prescription analyzed successfully!',
    scanError: 'Could not read prescription clearly. Please retake photo in good lighting.',
    yourMedicines: 'Your Medicines',
    readAloud: 'Read Aloud',
    stopReading: 'Stop Reading',
    addToRoutine: 'Add these medicines to your daily routine?',
    yes: 'Yes',
    no: 'No',
    addedToRoutine: 'Medicines added to your routine!',
    morning: 'Morning',
    afternoon: 'Afternoon',
    night: 'Night',
    aiExplanation: 'AI Explanation',
    
    // Page 2 - Routine
    dailyRoutine: 'Daily Routine',
    today: 'Today',
    noMedicines: 'No medicines scheduled',
    markAsTaken: 'Mark as taken',
    taken: 'Taken',
    pending: 'Pending',
    missed: 'Missed',
    addMedicine: 'Add Medicine',
    medicineName: 'Medicine Name',
    dosage: 'Dosage',
    timeSlot: 'Time Slot',
    instructions: 'Instructions',
    durationDays: 'Duration (days)',
    save: 'Save',
    cancel: 'Cancel',
    weeklyReport: 'Weekly Report',
    shareReport: 'Share Report',
    compliance: 'Compliance',
    
    // Page 3 - Profile
    userProfile: 'User Profile',
    name: 'Name',
    age: 'Age',
    language: 'Language',
    saveProfile: 'Save Profile',
    superUser: 'Super User (Caretaker)',
    superUserName: 'Caretaker Name',
    superUserPhone: 'Caretaker Phone',
    noSuperUser: 'No caretaker assigned',
    addSuperUser: 'Add Caretaker',
    english: 'English',
    hindi: 'Hindi',
    tamil: 'Tamil',
    profileSaved: 'Profile saved successfully!',
    
    // Alerts
    areYouOkay: 'Are you okay? Please let us know you are well.',
    imOkay: "I'm okay",
    needHelp: 'I need help',
    missedDoseAlert: 'You have missed some doses. Please take your medicine.',
  },
  hi: {
    // Navigation
    scan: 'स्कैन',
    routine: 'दिनचर्या',
    profile: 'प्रोफ़ाइल',
    
    // Page 1 - Scan
    prescriptionScanner: 'प्रिस्क्रिप्शन स्कैनर',
    takePhoto: 'फोटो लें',
    uploadFromGallery: 'गैलरी से अपलोड करें',
    scanning: 'प्रिस्क्रिप्शन स्कैन हो रहा है...',
    analyzeImage: 'प्रिस्क्रिप्शन का विश्लेषण करें',
    scanSuccess: 'प्रिस्क्रिप्शन का सफलतापूर्वक विश्लेषण हुआ!',
    scanError: 'प्रिस्क्रिप्शन स्पष्ट नहीं पढ़ सके। कृपया अच्छी रोशनी में दोबारा फोटो लें।',
    yourMedicines: 'आपकी दवाइयाँ',
    readAloud: 'जोर से पढ़ें',
    stopReading: 'पढ़ना बंद करें',
    addToRoutine: 'क्या इन दवाइयों को अपनी दिनचर्या में जोड़ें?',
    yes: 'हाँ',
    no: 'नहीं',
    addedToRoutine: 'दवाइयाँ आपकी दिनचर्या में जोड़ दी गईं!',
    morning: 'सुबह',
    afternoon: 'दोपहर',
    night: 'रात',
    aiExplanation: 'AI व्याख्या',
    
    // Page 2 - Routine
    dailyRoutine: 'दैनिक दिनचर्या',
    today: 'आज',
    noMedicines: 'कोई दवाई निर्धारित नहीं',
    markAsTaken: 'ली हुई मार्क करें',
    taken: 'ली हुई',
    pending: 'बाकी',
    missed: 'छूट गई',
    addMedicine: 'दवाई जोड़ें',
    medicineName: 'दवाई का नाम',
    dosage: 'खुराक',
    timeSlot: 'समय',
    instructions: 'निर्देश',
    durationDays: 'अवधि (दिन)',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    weeklyReport: 'साप्ताहिक रिपोर्ट',
    shareReport: 'रिपोर्ट शेयर करें',
    compliance: 'पालन',
    
    // Page 3 - Profile
    userProfile: 'उपयोगकर्ता प्रोफ़ाइल',
    name: 'नाम',
    age: 'उम्र',
    language: 'भाषा',
    saveProfile: 'प्रोफ़ाइल सहेजें',
    superUser: 'सुपर यूजर (देखभाल कर्ता)',
    superUserName: 'देखभाल कर्ता का नाम',
    superUserPhone: 'देखभाल कर्ता का फोन',
    noSuperUser: 'कोई देखभाल कर्ता निर्धारित नहीं',
    addSuperUser: 'देखभाल कर्ता जोड़ें',
    english: 'अंग्रेजी',
    hindi: 'हिंदी',
    tamil: 'तमिल',
    profileSaved: 'प्रोफ़ाइल सफलतापूर्वक सहेजा गया!',
    
    // Alerts
    areYouOkay: 'क्या आप ठीक हैं? कृपया हमें बताएं कि आप ठीक हैं।',
    imOkay: 'मैं ठीक हूँ',
    needHelp: 'मुझे मदद चाहिए',
    missedDoseAlert: 'आपने कुछ दवाई छोड़ दी है। कृपया अपनी दवाई लें।',
  },
  ta: {
    // Navigation
    scan: 'ஸ்கான்',
    routine: 'தினசரி',
    profile: 'ப்ரொபைல்',
    
    // Page 1 - Scan
    prescriptionScanner: 'பரிந்துரை ஸ்கானர்',
    takePhoto: 'போட்டோ எடுக்கவும்',
    uploadFromGallery: 'காலரியிலிருந்து பதிவேற்று',
    scanning: 'பரிந்துரை ஸ்கான் ஆகிறது...',
    analyzeImage: 'பரிந்துரையை பகுப்பாய்வு செய்',
    scanSuccess: 'பரிந்துரை வெற்றிகரமாக பகுப்பாய்வு செய்யப்பட்டது!',
    scanError: 'பரிந்துரையை தெளிவாக படிக்க முடியவில்லை. நல்ல வெளிச்சத்தில் மீண்டும் போட்டோ எடுக்கவும்.',
    yourMedicines: 'உங்கள் மருந்துகள்',
    readAloud: 'சத்தமாக படிக்கவும்',
    stopReading: 'படிப்பதை நிறுத்து',
    addToRoutine: 'இந்த மருந்துகளை உங்கள் தினசரி வழக்கத்தில் சேர்க்கவா?',
    yes: 'ஆம்',
    no: 'இல்லை',
    addedToRoutine: 'மருந்துகள் உங்கள் தினசரியில் சேர்க்கப்பட்டன!',
    morning: 'காலை',
    afternoon: 'மதியம்',
    night: 'இரவு',
    aiExplanation: 'AI விளக்கம்',
    
    // Page 2 - Routine
    dailyRoutine: 'தினசரி வழக்கம்',
    today: 'இன்று',
    noMedicines: 'மருந்துகள் திட்டமிடப்படவில்லை',
    markAsTaken: 'எடுத்ததாக குறி',
    taken: 'எடுத்தது',
    pending: 'பாகி',
    missed: 'தவறவிட்டது',
    addMedicine: 'மருந்து சேர்',
    medicineName: 'மருந்து பெயர்',
    dosage: 'அளவு',
    timeSlot: 'நேரம்',
    instructions: 'வழிமுறைகள்',
    durationDays: 'காலம் (நாட்கள்)',
    save: 'சேமி',
    cancel: 'ரத்து',
    weeklyReport: 'வார அறிக்கை',
    shareReport: 'அறிக்கையை பகிர்',
    compliance: 'பின்பற்றல்',
    
    // Page 3 - Profile
    userProfile: 'பயனர் ப்ரொபைல்',
    name: 'பெயர்',
    age: 'வயது',
    language: 'மொழி',
    saveProfile: 'ப்ரொபைல் சேமி',
    superUser: 'சூப்பர் பயனர் (பராமரிப்பாளர்)',
    superUserName: 'பராமரிப்பாளர் பெயர்',
    superUserPhone: 'பராமரிப்பாளர் போன்',
    noSuperUser: 'பராமரிப்பாளர் நியமிக்கப்படவில்லை',
    addSuperUser: 'பராமரிப்பாளர் சேர்',
    english: 'ஆங்கிலம்',
    hindi: 'ஹிந்தி',
    tamil: 'தமிழ்',
    profileSaved: 'ப்ரொபைல் வெற்றிகரமாக சேமிக்கப்பட்டது!',
    
    // Alerts
    areYouOkay: 'நீங்கள் நலமாக இருக்கிறீர்களா? தயவுசெய்து எங்களுக்கு தெரிவிக்கவும்.',
    imOkay: 'நான் நலமாக இருக்கிறேன்',
    needHelp: 'எனக்கு உதவி தேவை',
    missedDoseAlert: 'நீங்கள் சில மருந்துகளை தவறவிட்டீர்கள். தயவுசெய்து உங்கள் மருந்தை எடுங்கள்.',
  }
};

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('medilang_language');
      if (savedLang) {
        setLanguageState(savedLang);
      }
    } catch (e) {
      console.log('Error loading language:', e);
    }
  };

  const setLanguage = async (lang: string) => {
    try {
      await AsyncStorage.setItem('medilang_language', lang);
      setLanguageState(lang);
    } catch (e) {
      console.log('Error saving language:', e);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
