import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const LANGS = { en: 'English', ta: 'தமிழ்', hi: 'हिन्दी', te: 'తెలుగు', kn: 'ಕನ್ನಡ' };

const en = {
  'nav.chatbot': 'AI Chatbot',
  'nav.home': 'Home', 'nav.sound': 'Animal Sounds', 'nav.distress': 'Distress Detection', 'nav.support': 'Nearby Help',
  'nav.dashboard': 'Dashboard', 'nav.admin': 'Admin', 'nav.login': 'Log in', 'nav.logout': 'Log out',
  'support.title': 'Nearby animal help', 'support.subtitle': 'Find veterinary hospitals, shelters and rescue centres close to you.',
  'support.useLocation': 'Use my location', 'support.locating': 'Finding your location…',
  'support.locationDenied': 'Location permission was denied. Please choose a state or city instead.',
  'support.locationOn': 'Using your current location', 'support.state': 'State', 'support.district': 'District', 'support.city': 'City',
  'support.type': 'Type', 'support.allTypes': 'All types', 'support.all': 'All', 'support.search': 'Search by name or address',
  'support.results': 'Results', 'support.noResults': 'No matching centres found.', 'support.distance': 'Distance', 'support.hours': 'Hours',
  'support.phone': 'Phone', 'support.address': 'Address', 'support.directions': 'Directions', 'support.route': 'Show route',
  'support.call': 'Call', 'support.open24h': 'Open 24 hours', 'support.yourLocation': 'Your location', 'support.sample': 'Sample data',
  'support.clear': 'Clear filters',
  'type.veterinary_hospital': 'Veterinary hospital', 'type.animal_shelter': 'Animal shelter', 'type.rescue_center': 'Rescue center',
  'type.ngo': 'NGO', 'type.welfare_org': 'Animal welfare organization',
  'common.loading': 'Loading…', 'common.retry': 'Try again', 'common.km': 'km'
};
const ta = {
  'nav.chatbot': 'AI உதவியாளர்',
  'nav.home': 'முகப்பு', 'nav.sound': 'விலங்கு ஒலிகள்', 'nav.distress': 'துயர ஒலி கண்டறிதல்', 'nav.support': 'அருகிலுள்ள உதவி',
  'nav.dashboard': 'டாஷ்போர்டு', 'nav.admin': 'நிர்வாகம்', 'nav.login': 'உள்நுழை', 'nav.logout': 'வெளியேறு',
  'support.title': 'அருகிலுள்ள விலங்கு உதவி', 'support.subtitle': 'உங்கள் அருகிலுள்ள கால்நடை மருத்துவமனைகள், காப்பகங்கள் மற்றும் மீட்பு மையங்களைக் கண்டறியுங்கள்.',
  'support.useLocation': 'என் இருப்பிடத்தைப் பயன்படுத்து', 'support.locating': 'உங்கள் இருப்பிடத்தைக் கண்டறிகிறது…',
  'support.locationDenied': 'இருப்பிட அனுமதி மறுக்கப்பட்டது. மாநிலம் அல்லது நகரத்தைத் தேர்ந்தெடுக்கவும்.',
  'support.locationOn': 'உங்கள் தற்போதைய இருப்பிடம் பயன்படுத்தப்படுகிறது', 'support.state': 'மாநிலம்', 'support.district': 'மாவட்டம்', 'support.city': 'நகரம்',
  'support.type': 'வகை', 'support.allTypes': 'அனைத்து வகைகள்', 'support.all': 'அனைத்தும்', 'support.search': 'பெயர் அல்லது முகவரி மூலம் தேடு',
  'support.results': 'முடிவுகள்', 'support.noResults': 'பொருந்தும் மையங்கள் இல்லை.', 'support.distance': 'தூரம்', 'support.hours': 'நேரம்',
  'support.phone': 'தொலைபேசி', 'support.address': 'முகவரி', 'support.directions': 'வழிகாட்டு', 'support.route': 'வழியைக் காட்டு',
  'support.call': 'அழை', 'support.open24h': '24 மணி நேரமும் திறந்திருக்கும்', 'support.yourLocation': 'உங்கள் இருப்பிடம்', 'support.sample': 'மாதிரி தரவு',
  'support.clear': 'வடிகட்டிகளை அழி',
  'type.veterinary_hospital': 'கால்நடை மருத்துவமனை', 'type.animal_shelter': 'விலங்கு காப்பகம்', 'type.rescue_center': 'மீட்பு மையம்',
  'type.ngo': 'தன்னார்வ அமைப்பு (NGO)', 'type.welfare_org': 'விலங்கு நல அமைப்பு',
  'common.loading': 'ஏற்றுகிறது…', 'common.retry': 'மீண்டும் முயற்சி', 'common.km': 'கி.மீ'
};
const hi = {
  'nav.chatbot': 'AI चैटबॉट',
  'nav.home': 'होम', 'nav.sound': 'पशु ध्वनि', 'nav.distress': 'संकट ध्वनि पहचान', 'nav.support': 'पास में सहायता',
  'nav.dashboard': 'डैशबोर्ड', 'nav.admin': 'एडमिन', 'nav.login': 'लॉग इन', 'nav.logout': 'लॉग आउट',
  'support.title': 'पास में पशु सहायता', 'support.subtitle': 'अपने पास के पशु चिकित्सालय, आश्रय और बचाव केंद्र खोजें।',
  'support.useLocation': 'मेरी लोकेशन का उपयोग करें', 'support.locating': 'आपकी लोकेशन खोज रहे हैं…',
  'support.locationDenied': 'लोकेशन की अनुमति नहीं मिली। कृपया राज्य या शहर चुनें।',
  'support.locationOn': 'आपकी वर्तमान लोकेशन उपयोग में है', 'support.state': 'राज्य', 'support.district': 'ज़िला', 'support.city': 'शहर',
  'support.type': 'प्रकार', 'support.allTypes': 'सभी प्रकार', 'support.all': 'सभी', 'support.search': 'नाम या पते से खोजें',
  'support.results': 'परिणाम', 'support.noResults': 'कोई केंद्र नहीं मिला।', 'support.distance': 'दूरी', 'support.hours': 'समय',
  'support.phone': 'फ़ोन', 'support.address': 'पता', 'support.directions': 'दिशा-निर्देश', 'support.route': 'रास्ता दिखाएँ',
  'support.call': 'कॉल करें', 'support.open24h': '24 घंटे खुला', 'support.yourLocation': 'आपकी लोकेशन', 'support.sample': 'नमूना डेटा',
  'support.clear': 'फ़िल्टर हटाएँ',
  'type.veterinary_hospital': 'पशु चिकित्सालय', 'type.animal_shelter': 'पशु आश्रय', 'type.rescue_center': 'बचाव केंद्र',
  'type.ngo': 'एनजीओ', 'type.welfare_org': 'पशु कल्याण संगठन',
  'common.loading': 'लोड हो रहा है…', 'common.retry': 'पुनः प्रयास करें', 'common.km': 'किमी'
};
const te = {
  'nav.chatbot': 'AI చాట్‌బాట్',
  'nav.home': 'హోమ్', 'nav.sound': 'జంతు శబ్దాలు', 'nav.distress': 'ఆపద శబ్ద గుర్తింపు', 'nav.support': 'సమీప సహాయం',
  'nav.dashboard': 'డాష్‌బోర్డ్', 'nav.admin': 'అడ్మిన్', 'nav.login': 'లాగిన్', 'nav.logout': 'లాగౌట్',
  'support.title': 'సమీపంలోని జంతు సహాయం', 'support.subtitle': 'మీకు దగ్గరలోని పశువైద్యశాలలు, ఆశ్రయాలు మరియు రక్షణ కేంద్రాలను కనుగొనండి.',
  'support.useLocation': 'నా లొకేషన్ ఉపయోగించు', 'support.locating': 'మీ లొకేషన్ కనుగొంటోంది…',
  'support.locationDenied': 'లొకేషన్ అనుమతి నిరాకరించబడింది. దయచేసి రాష్ట్రం లేదా నగరాన్ని ఎంచుకోండి.',
  'support.locationOn': 'మీ ప్రస్తుత లొకేషన్ ఉపయోగిస్తున్నాం', 'support.state': 'రాష్ట్రం', 'support.district': 'జిల్లా', 'support.city': 'నగరం',
  'support.type': 'రకం', 'support.allTypes': 'అన్ని రకాలు', 'support.all': 'అన్నీ', 'support.search': 'పేరు లేదా చిరునామాతో వెతకండి',
  'support.results': 'ఫలితాలు', 'support.noResults': 'సరిపోలే కేంద్రాలు లేవు.', 'support.distance': 'దూరం', 'support.hours': 'సమయాలు',
  'support.phone': 'ఫోన్', 'support.address': 'చిరునామా', 'support.directions': 'దిశలు', 'support.route': 'మార్గం చూపించు',
  'support.call': 'కాల్ చేయి', 'support.open24h': '24 గంటలు తెరిచి ఉంటుంది', 'support.yourLocation': 'మీ లొకేషన్', 'support.sample': 'నమూనా డేటా',
  'support.clear': 'ఫిల్టర్లు తొలగించు',
  'type.veterinary_hospital': 'పశువైద్యశాల', 'type.animal_shelter': 'జంతు ఆశ్రయం', 'type.rescue_center': 'రక్షణ కేంద్రం',
  'type.ngo': 'ఎన్జీఓ', 'type.welfare_org': 'జంతు సంక్షేమ సంస్థ',
  'common.loading': 'లోడ్ అవుతోంది…', 'common.retry': 'మళ్లీ ప్రయత్నించండి', 'common.km': 'కి.మీ'
};
const kn = {
  'nav.chatbot': 'AI ಚಾಟ್‌ಬಾಟ್',
  'nav.home': 'ಮುಖಪುಟ', 'nav.sound': 'ಪ್ರಾಣಿ ಶಬ್ದಗಳು', 'nav.distress': 'ಸಂಕಷ್ಟ ಶಬ್ದ ಪತ್ತೆ', 'nav.support': 'ಹತ್ತಿರದ ಸಹಾಯ',
  'nav.dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'nav.admin': 'ಅಡ್ಮಿನ್', 'nav.login': 'ಲಾಗಿನ್', 'nav.logout': 'ಲಾಗ್ ಔಟ್',
  'support.title': 'ಹತ್ತಿರದ ಪ್ರಾಣಿ ಸಹಾಯ', 'support.subtitle': 'ನಿಮ್ಮ ಹತ್ತಿರದ ಪಶುವೈದ್ಯ ಆಸ್ಪತ್ರೆಗಳು, ಆಶ್ರಯಗಳು ಮತ್ತು ರಕ್ಷಣಾ ಕೇಂದ್ರಗಳನ್ನು ಹುಡುಕಿ.',
  'support.useLocation': 'ನನ್ನ ಸ್ಥಳವನ್ನು ಬಳಸಿ', 'support.locating': 'ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಹುಡುಕುತ್ತಿದೆ…',
  'support.locationDenied': 'ಸ್ಥಳದ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ರಾಜ್ಯ ಅಥವಾ ನಗರವನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
  'support.locationOn': 'ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಳವನ್ನು ಬಳಸಲಾಗುತ್ತಿದೆ', 'support.state': 'ರಾಜ್ಯ', 'support.district': 'ಜಿಲ್ಲೆ', 'support.city': 'ನಗರ',
  'support.type': 'ಪ್ರಕಾರ', 'support.allTypes': 'ಎಲ್ಲಾ ಪ್ರಕಾರಗಳು', 'support.all': 'ಎಲ್ಲಾ', 'support.search': 'ಹೆಸರು ಅಥವಾ ವಿಳಾಸದಿಂದ ಹುಡುಕಿ',
  'support.results': 'ಫಲಿತಾಂಶಗಳು', 'support.noResults': 'ಹೊಂದುವ ಕೇಂದ್ರಗಳಿಲ್ಲ.', 'support.distance': 'ದೂರ', 'support.hours': 'ಸಮಯ',
  'support.phone': 'ಫೋನ್', 'support.address': 'ವಿಳಾಸ', 'support.directions': 'ದಾರಿ ಸೂಚನೆ', 'support.route': 'ಮಾರ್ಗ ತೋರಿಸಿ',
  'support.call': 'ಕರೆ ಮಾಡಿ', 'support.open24h': '24 ಗಂಟೆ ತೆರೆದಿರುತ್ತದೆ', 'support.yourLocation': 'ನಿಮ್ಮ ಸ್ಥಳ', 'support.sample': 'ಮಾದರಿ ಡೇಟಾ',
  'support.clear': 'ಫಿಲ್ಟರ್ ತೆರವುಗೊಳಿಸಿ',
  'type.veterinary_hospital': 'ಪಶುವೈದ್ಯ ಆಸ್ಪತ್ರೆ', 'type.animal_shelter': 'ಪ್ರಾಣಿ ಆಶ್ರಯ', 'type.rescue_center': 'ರಕ್ಷಣಾ ಕೇಂದ್ರ',
  'type.ngo': 'ಎನ್‌ಜಿಒ', 'type.welfare_org': 'ಪ್ರಾಣಿ ಕಲ್ಯಾಣ ಸಂಸ್ಥೆ',
  'common.loading': 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…', 'common.retry': 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ', 'common.km': 'ಕಿಮೀ'
};
const DICT = { en, ta, hi, te, kn };

const Ctx = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('rp_lang') || 'en'; } catch { return 'en'; } });
  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem('rp_lang', lang); } catch { /* ignore */ }
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t: (k) => DICT[lang]?.[k] ?? en[k] ?? k }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
