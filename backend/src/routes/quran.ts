import type { FastifyInstance } from 'fastify';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

// Pre-seed data with 30 authentic Qur'anic verses
const SEED_VERSES = [
  {
    surahNumber: 2,
    ayahNumber: 183,
    arabicText: 'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ كُتِبَ عَلَيْكُمُ ٱلصِّيَامُ كَمَا كُتِبَ عَلَى ٱلَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ',
    englishTranslation: 'O you who have believed, decreed upon you is fasting as it was decreed upon those before you that you may become righteous.',
    surahNameArabic: 'البقرة',
    surahNameEnglish: 'Al-Baqarah',
  },
  {
    surahNumber: 2,
    ayahNumber: 186,
    arabicText: 'وَإِذَا سَأَلَكَ عِبَادِى عَنِّى فَإِنِّى قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ ٱلدَّاعِ إِذَا دَعَانِ ۖ فَلْيَسْتَجِيبُوا۟ لِى وَلْيُؤْمِنُوا۟ بِى لَعَلَّهُمْ يَرْشُدُونَ',
    englishTranslation: 'And when My servants ask you concerning Me - indeed I am near. I respond to the invocation of the supplicant when he calls upon Me. So let them respond to Me and believe in Me that they may be guided.',
    surahNameArabic: 'البقرة',
    surahNameEnglish: 'Al-Baqarah',
  },
  {
    surahNumber: 2,
    ayahNumber: 153,
    arabicText: 'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ ۚ إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ',
    englishTranslation: 'O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.',
    surahNameArabic: 'البقرة',
    surahNameEnglish: 'Al-Baqarah',
  },
  {
    surahNumber: 97,
    ayahNumber: 1,
    arabicText: 'إِنَّآ أَنزَلْنَٰهُ فِى لَيْلَةِ ٱلْقَدْرِ',
    englishTranslation: 'Indeed, We sent the Quran down during the Night of Decree.',
    surahNameArabic: 'القدر',
    surahNameEnglish: 'Al-Qadr',
  },
  {
    surahNumber: 97,
    ayahNumber: 3,
    arabicText: 'لَيْلَةُ ٱلْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ',
    englishTranslation: 'The Night of Decree is better than a thousand months.',
    surahNameArabic: 'القدر',
    surahNameEnglish: 'Al-Qadr',
  },
  {
    surahNumber: 55,
    ayahNumber: 13,
    arabicText: 'فَبِأَىِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ',
    englishTranslation: 'So which of the favors of your Lord would you deny?',
    surahNameArabic: 'الرحمن',
    surahNameEnglish: 'Ar-Rahman',
  },
  {
    surahNumber: 94,
    ayahNumber: 5,
    arabicText: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
    englishTranslation: 'For indeed, with hardship comes ease.',
    surahNameArabic: 'الشرح',
    surahNameEnglish: 'Ash-Sharh',
  },
  {
    surahNumber: 94,
    ayahNumber: 6,
    arabicText: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
    englishTranslation: 'Indeed, with hardship comes ease.',
    surahNameArabic: 'الشرح',
    surahNameEnglish: 'Ash-Sharh',
  },
  {
    surahNumber: 3,
    ayahNumber: 200,
    arabicText: 'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱصْبِرُوا۟ وَصَابِرُوا۟ وَرَابِطُوا۟ وَٱتَّقُوا۟ ٱللَّهَ لَعَلَّكُمْ تُفْلِحُونَ',
    englishTranslation: 'O you who have believed, persevere and endure and remain stationed and fear Allah that you may be successful.',
    surahNameArabic: 'آل عمران',
    surahNameEnglish: 'Ali Imran',
  },
  {
    surahNumber: 13,
    ayahNumber: 28,
    arabicText: 'ٱلَّذِينَ ءَامَنُوا۟ وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ ٱللَّهِ ۗ أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ',
    englishTranslation: 'Those who have believed and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured.',
    surahNameArabic: 'الرعد',
    surahNameEnglish: 'Ar-Rad',
  },
  {
    surahNumber: 29,
    ayahNumber: 45,
    arabicText: 'ٱتْلُ مَآ أُوحِىَ إِلَيْكَ مِنَ ٱلْكِتَٰبِ وَأَقِمِ ٱلصَّلَوٰةَ ۖ إِنَّ ٱلصَّلَوٰةَ تَنْهَىٰ عَنِ ٱلْفَحْشَآءِ وَٱلْمُنكَرِ ۗ وَلَذِكْرُ ٱللَّهِ أَكْبَرُ ۗ وَٱللَّهُ يَعْلَمُ مَا تَصْنَعُونَ',
    englishTranslation: 'Recite what has been revealed to you of the Book and establish prayer. Indeed, prayer prohibits immorality and wrongdoing, and the remembrance of Allah is greater. And Allah knows that which you do.',
    surahNameArabic: 'العنكبوت',
    surahNameEnglish: 'Al-Ankabut',
  },
  {
    surahNumber: 14,
    ayahNumber: 7,
    arabicText: 'وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ ۖ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِى لَشَدِيدٌ',
    englishTranslation: 'And when your Lord proclaimed, "If you are grateful, I will surely increase you in favor; but if you deny, indeed, My punishment is severe."',
    surahNameArabic: 'إبراهيم',
    surahNameEnglish: 'Ibrahim',
  },
  {
    surahNumber: 2,
    ayahNumber: 152,
    arabicText: 'فَٱذْكُرُونِىٓ أَذْكُرْكُمْ وَٱشْكُرُوا۟ لِى وَلَا تَكْفُرُونِ',
    englishTranslation: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.',
    surahNameArabic: 'البقرة',
    surahNameEnglish: 'Al-Baqarah',
  },
  {
    surahNumber: 33,
    ayahNumber: 41,
    arabicText: 'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱذْكُرُوا۟ ٱللَّهَ ذِكْرًا كَثِيرًا',
    englishTranslation: 'O you who have believed, remember Allah with much remembrance.',
    surahNameArabic: 'الأحزاب',
    surahNameEnglish: 'Al-Ahzab',
  },
  {
    surahNumber: 3,
    ayahNumber: 191,
    arabicText: 'ٱلَّذِينَ يَذْكُرُونَ ٱللَّهَ قِيَٰمًا وَقُعُودًا وَعَلَىٰ جُنُوبِهِمْ وَيَتَفَكَّرُونَ فِى خَلْقِ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ رَبَّنَا مَا خَلَقْتَ هَٰذَا بَٰطِلًا سُبْحَٰنَكَ فَقِنَا عَذَابَ ٱلنَّارِ',
    englishTranslation: 'Who remember Allah while standing or sitting or lying on their sides and give thought to the creation of the heavens and the earth, saying, "Our Lord, You did not create this aimlessly; exalted are You; then protect us from the punishment of the Fire."',
    surahNameArabic: 'آل عمران',
    surahNameEnglish: 'Ali Imran',
  },
  {
    surahNumber: 25,
    ayahNumber: 63,
    arabicText: 'وَعِبَادُ ٱلرَّحْمَٰنِ ٱلَّذِينَ يَمْشُونَ عَلَى ٱلْأَرْضِ هَوْنًا وَإِذَا خَاطَبَهُمُ ٱلْجَٰهِلُونَ قَالُوا۟ سَلَٰمًا',
    englishTranslation: 'And the servants of the Most Merciful are those who walk upon the earth easily, and when the ignorant address them, they say words of peace.',
    surahNameArabic: 'الفرقان',
    surahNameEnglish: 'Al-Furqan',
  },
  {
    surahNumber: 49,
    ayahNumber: 13,
    arabicText: 'يَٰٓأَيُّهَا ٱلنَّاسُ إِنَّا خَلَقْنَٰكُم مِّن ذَكَرٍ وَأُنثَىٰ وَجَعَلْنَٰكُمْ شُعُوبًا وَقَبَآئِلَ لِتَعَارَفُوٓا۟ ۚ إِنَّ أَكْرَمَكُمْ عِندَ ٱللَّهِ أَتْقَىٰكُمْ ۚ إِنَّ ٱللَّهَ عَلِيمٌ خَبِيرٌ',
    englishTranslation: 'O mankind, indeed We have created you from male and female and made you peoples and tribes that you may know one another. Indeed, the most noble of you in the sight of Allah is the most righteous of you. Indeed, Allah is Knowing and Acquainted.',
    surahNameArabic: 'الحجرات',
    surahNameEnglish: 'Al-Hujurat',
  },
  {
    surahNumber: 39,
    ayahNumber: 53,
    arabicText: 'قُلْ يَٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا۟ عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا۟ مِن رَّحْمَةِ ٱللَّهِ ۚ إِنَّ ٱللَّهَ يَغْفِرُ ٱلذُّنُوبَ جَمِيعًا ۚ إِنَّهُۥ هُوَ ٱلْغَفُورُ ٱلرَّحِيمُ',
    englishTranslation: 'Say, "O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, Allah forgives all sins. Indeed, it is He who is the Forgiving, the Merciful."',
    surahNameArabic: 'الزمر',
    surahNameEnglish: 'Az-Zumar',
  },
  {
    surahNumber: 2,
    ayahNumber: 286,
    arabicText: 'لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا ٱكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَآ إِن نَّسِينَآ أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَآ إِصْرًا كَمَا حَمَلْتَهُۥ عَلَى ٱلَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِۦ ۖ وَٱعْفُ عَنَّا وَٱغْفِرْ لَنَا وَٱرْحَمْنَآ ۚ أَنتَ مَوْلَىٰنَا فَٱنصُرْنَا عَلَى ٱلْقَوْمِ ٱلْكَٰفِرِينَ',
    englishTranslation: 'Allah does not burden a soul beyond that it can bear. It will have what it has gained, and it will bear what it has earned. "Our Lord, do not impose blame upon us if we have forgotten or erred. Our Lord, and lay not upon us a burden like that which You laid upon those before us. Our Lord, and burden us not with that which we have no ability to bear. And pardon us; and forgive us; and have mercy upon us. You are our protector, so give us victory over the disbelieving people."',
    surahNameArabic: 'البقرة',
    surahNameEnglish: 'Al-Baqarah',
  },
  {
    surahNumber: 17,
    ayahNumber: 82,
    arabicText: 'وَنُنَزِّلُ مِنَ ٱلْقُرْءَانِ مَا هُوَ شِفَآءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ ۙ وَلَا يَزِيدُ ٱلظَّٰلِمِينَ إِلَّا خَسَارًا',
    englishTranslation: 'And We send down of the Quran that which is healing and mercy for the believers, but it does not increase the wrongdoers except in loss.',
    surahNameArabic: 'الإسراء',
    surahNameEnglish: 'Al-Isra',
  },
  {
    surahNumber: 20,
    ayahNumber: 114,
    arabicText: 'فَتَعَٰلَى ٱللَّهُ ٱلْمَلِكُ ٱلْحَقُّ ۗ وَلَا تَعْجَلْ بِٱلْقُرْءَانِ مِن قَبْلِ أَن يُقْضَىٰٓ إِلَيْكَ وَحْيُهُۥ ۖ وَقُل رَّبِّ زِدْنِى عِلْمًا',
    englishTranslation: 'So high above is Allah, the Sovereign, the Truth. And, do not hasten with recitation of the Quran before its revelation is completed to you, and say, "My Lord, increase me in knowledge."',
    surahNameArabic: 'طه',
    surahNameEnglish: 'Taha',
  },
  {
    surahNumber: 24,
    ayahNumber: 35,
    arabicText: 'ٱللَّهُ نُورُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ ۚ مَثَلُ نُورِهِۦ كَمِشْكَوٰةٍ فِيهَا مِصْبَاحٌ ۖ ٱلْمِصْبَاحُ فِى زُجَاجَةٍ ۖ ٱلزُّجَاجَةُ كَأَنَّهَا كَوْكَبٌ دُرِّىٌّ يُوقَدُ مِن شَجَرَةٍ مُّبَٰرَكَةٍ زَيْتُونَةٍ لَّا شَرْقِيَّةٍ وَلَا غَرْبِيَّةٍ يَكَادُ زَيْتُهَا يُضِىٓءُ وَلَوْ لَمْ تَمْسَسْهُ نَارٌ ۚ نُّورٌ عَلَىٰ نُورٍ ۗ يَهْدِى ٱللَّهُ لِنُورِهِۦ مَن يَشَآءُ ۚ وَيَضْرِبُ ٱللَّهُ ٱلْأَمْثَٰلَ لِلنَّاسِ ۗ وَٱللَّهُ بِكُلِّ شَىْءٍ عَلِيمٌ',
    englishTranslation: 'Allah is the Light of the heavens and the earth. The example of His light is like a niche within which is a lamp, the lamp is within glass, the glass as if it were a pearly star lit from the oil of a blessed olive tree, neither of the east nor of the west, whose oil would almost glow even if untouched by fire. Light upon light. Allah guides to His light whom He wills. And Allah presents examples for the people, and Allah is Knowing of all things.',
    surahNameArabic: 'النور',
    surahNameEnglish: 'An-Nur',
  },
  {
    surahNumber: 41,
    ayahNumber: 34,
    arabicText: 'وَلَا تَسْتَوِى ٱلْحَسَنَةُ وَلَا ٱلسَّيِّئَةُ ۚ ٱدْفَعْ بِٱلَّتِى هِىَ أَحْسَنُ فَإِذَا ٱلَّذِى بَيْنَكَ وَبَيْنَهُۥ عَدَٰوَةٌ كَأَنَّهُۥ وَلِىٌّ حَمِيمٌ',
    englishTranslation: 'And not equal are the good deed and the bad. Repel evil by that which is better; and thereupon the one whom between you and him is enmity will become as though he was a devoted friend.',
    surahNameArabic: 'فصلت',
    surahNameEnglish: 'Fussilat',
  },
  {
    surahNumber: 16,
    ayahNumber: 90,
    arabicText: 'إِنَّ ٱللَّهَ يَأْمُرُ بِٱلْعَدْلِ وَٱلْإِحْسَٰنِ وَإِيتَآئِ ذِى ٱلْقُرْبَىٰ وَيَنْهَىٰ عَنِ ٱلْفَحْشَآءِ وَٱلْمُنكَرِ وَٱلْبَغْىِ ۚ يَعِظُكُمْ لَعَلَّكُمْ تَذَكَّرُونَ',
    englishTranslation: 'Indeed, Allah orders justice and good conduct and giving to relatives and forbids immorality and bad conduct and oppression. He admonishes you that perhaps you will be reminded.',
    surahNameArabic: 'النحل',
    surahNameEnglish: 'An-Nahl',
  },
  {
    surahNumber: 103,
    ayahNumber: 1,
    arabicText: 'وَٱلْعَصْرِ',
    englishTranslation: 'By time,',
    surahNameArabic: 'العصر',
    surahNameEnglish: 'Al-Asr',
  },
  {
    surahNumber: 103,
    ayahNumber: 2,
    arabicText: 'إِنَّ ٱلْإِنسَٰنَ لَفِى خُسْرٍ',
    englishTranslation: 'Indeed, mankind is in loss,',
    surahNameArabic: 'العصر',
    surahNameEnglish: 'Al-Asr',
  },
  {
    surahNumber: 103,
    ayahNumber: 3,
    arabicText: 'إِلَّا ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّٰلِحَٰتِ وَتَوَاصَوْا۟ بِٱلْحَقِّ وَتَوَاصَوْا۟ بِٱلصَّبْرِ',
    englishTranslation: 'Except for those who have believed and done righteous deeds and advised each other to truth and advised each other to patience.',
    surahNameArabic: 'العصر',
    surahNameEnglish: 'Al-Asr',
  },
  {
    surahNumber: 64,
    ayahNumber: 16,
    arabicText: 'فَٱتَّقُوا۟ ٱللَّهَ مَا ٱسْتَطَعْتُمْ وَٱسْمَعُوا۟ وَأَطِيعُوا۟ وَأَنفِقُوا۟ خَيْرًا لِّأَنفُسِكُمْ ۗ وَمَن يُوقَ شُحَّ نَفْسِهِۦ فَأُو۟لَٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ',
    englishTranslation: 'So fear Allah as much as you are able and listen and obey and spend in the way of Allah; it is better for your selves. And whoever is protected from the stinginess of his soul - it is those who will be the successful.',
    surahNameArabic: 'التغابن',
    surahNameEnglish: 'At-Taghabun',
  },
  {
    surahNumber: 2,
    ayahNumber: 185,
    arabicText: 'شَهْرُ رَمَضَانَ ٱلَّذِىٓ أُنزِلَ فِيهِ ٱلْقُرْءَانُ هُدًى لِّلنَّاسِ وَبَيِّنَٰتٍ مِّنَ ٱلْهُدَىٰ وَٱلْفُرْقَانِ ۚ فَمَن شَهِدَ مِنكُمُ ٱلشَّهْرَ فَلْيَصُمْهُ ۖ وَمَن كَانَ مَرِيضًا أَوْ عَلَىٰ سَفَرٍ فَعِدَّةٌ مِّنْ أَيَّامٍ أُخَرَ ۗ يُرِيدُ ٱللَّهُ بِكُمُ ٱلْيُسْرَ وَلَا يُرِيدُ بِكُمُ ٱلْعُسْرَ وَلِتُكْمِلُوا۟ ٱلْعِدَّةَ وَلِتُكَبِّرُوا۟ ٱللَّهَ عَلَىٰ مَا هَدَىٰكُمْ وَلَعَلَّكُمْ تَشْكُرُونَ',
    englishTranslation: 'The month of Ramadan in which was revealed the Quran, a guidance for the people and clear proofs of guidance and criterion. So whoever sights the new moon of the month, let him fast it; and whoever is ill or on a journey - then an equal number of other days. Allah intends for you ease and does not intend for you hardship and wants for you to complete the period and to glorify Allah for that to which He has guided you; and perhaps you will be grateful.',
    surahNameArabic: 'البقرة',
    surahNameEnglish: 'Al-Baqarah',
  },
  {
    surahNumber: 59,
    ayahNumber: 7,
    arabicText: 'وَمَآ ءَاتَىٰكُمُ ٱلرَّسُولُ فَخُذُوهُ وَمَا نَهَىٰكُمْ عَنْهُ فَٱنتَهُوا۟ ۚ وَٱتَّقُوا۟ ٱللَّهَ ۖ إِنَّ ٱللَّهَ شَدِيدُ ٱلْعِقَابِ',
    englishTranslation: 'And whatever the Messenger has given you - take; and what he has forbidden you - refrain from. And fear Allah; indeed, Allah is severe in penalty.',
    surahNameArabic: 'الحشر',
    surahNameEnglish: 'Al-Hashr',
  },
];

export function register(app: App, fastify: FastifyInstance) {
  // GET /api/quran/daily-verse - Get the verse of the day
  fastify.get('/api/quran/daily-verse', {
    schema: {
      description: 'Get the Quranic verse of the day',
      tags: ['quran'],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            surahNumber: { type: 'number' },
            ayahNumber: { type: 'number' },
            arabicText: { type: 'string' },
            englishTranslation: { type: 'string' },
            surahNameArabic: { type: 'string' },
            surahNameEnglish: { type: 'string' },
            reference: { type: 'string' },
          },
        },
        404: { type: 'object' },
        500: { type: 'object' },
      },
    },
  }, async (request, reply) => {
    app.logger.info({}, 'Fetching daily Quran verse');

    try {
      // Get all verses from database
      let allVerses = await app.db.select().from(schema.quranVerses);

      // Auto-seed if database is empty
      if (allVerses.length === 0) {
        app.logger.info({}, 'Database is empty, auto-seeding Quran verses');

        // Insert seed verses
        const insertedVerses = await app.db
          .insert(schema.quranVerses)
          .values(SEED_VERSES)
          .returning();

        app.logger.info(
          { count: insertedVerses.length },
          'Auto-seeded Quran verses successfully'
        );

        // Update allVerses with the newly inserted verses
        allVerses = insertedVerses;
      }

      // Calculate day of year for deterministic verse selection
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 0);
      const diff = now.getTime() - startOfYear.getTime();
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

      // Use modulo to select verse based on day of year
      const verseIndex = dayOfYear % allVerses.length;
      const verse = allVerses[verseIndex];

      app.logger.info(
        { verseId: verse.id, dayOfYear, verseIndex, surah: verse.surahNumber, ayah: verse.ayahNumber },
        'Daily verse selected'
      );

      // Format the reference
      const reference = `${verse.surahNameEnglish} ${verse.surahNumber}:${verse.ayahNumber}`;

      return {
        id: verse.id,
        surahNumber: verse.surahNumber,
        ayahNumber: verse.ayahNumber,
        arabicText: verse.arabicText,
        englishTranslation: verse.englishTranslation,
        surahNameArabic: verse.surahNameArabic,
        surahNameEnglish: verse.surahNameEnglish,
        reference,
      };
    } catch (error) {
      app.logger.error(
        { err: error },
        'Failed to fetch daily Quran verse'
      );
      return reply.code(500).send({
        error: 'Failed to fetch daily Quran verse',
      });
    }
  });

  // POST /api/quran/verses - Seed or add new verses
  fastify.post<{
    Body: {
      surahNumber: number;
      ayahNumber: number;
      arabicText: string;
      englishTranslation: string;
      surahNameArabic: string;
      surahNameEnglish: string;
    };
  }>('/api/quran/verses', {
    schema: {
      description: 'Add a new Quran verse',
      tags: ['quran'],
      body: {
        type: 'object',
        properties: {
          surahNumber: { type: 'number' },
          ayahNumber: { type: 'number' },
          arabicText: { type: 'string' },
          englishTranslation: { type: 'string' },
          surahNameArabic: { type: 'string' },
          surahNameEnglish: { type: 'string' },
        },
        required: ['surahNumber', 'ayahNumber', 'arabicText', 'englishTranslation', 'surahNameArabic', 'surahNameEnglish'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            surahNumber: { type: 'number' },
            ayahNumber: { type: 'number' },
            arabicText: { type: 'string' },
            englishTranslation: { type: 'string' },
            surahNameArabic: { type: 'string' },
            surahNameEnglish: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
        400: { type: 'object' },
        500: { type: 'object' },
      },
    },
  }, async (request, reply) => {
    const { surahNumber, ayahNumber, arabicText, englishTranslation, surahNameArabic, surahNameEnglish } = request.body;

    app.logger.info(
      { surahNumber, ayahNumber, surahNameEnglish },
      'Adding Quran verse'
    );

    try {
      // Validate surah number (1-114)
      if (surahNumber < 1 || surahNumber > 114) {
        app.logger.warn({ surahNumber }, 'Invalid surah number');
        return reply.code(400).send({
          error: 'Invalid surah number. Must be between 1 and 114.',
        });
      }

      // Validate ayah number
      if (ayahNumber < 1) {
        app.logger.warn({ ayahNumber }, 'Invalid ayah number');
        return reply.code(400).send({
          error: 'Invalid ayah number. Must be at least 1.',
        });
      }

      // Insert the verse
      const inserted = await app.db
        .insert(schema.quranVerses)
        .values({
          surahNumber,
          ayahNumber,
          arabicText,
          englishTranslation,
          surahNameArabic,
          surahNameEnglish,
        })
        .returning();

      const verse = inserted[0];

      app.logger.info(
        { verseId: verse.id, surah: verse.surahNumber, ayah: verse.ayahNumber },
        'Quran verse added successfully'
      );

      return {
        id: verse.id,
        surahNumber: verse.surahNumber,
        ayahNumber: verse.ayahNumber,
        arabicText: verse.arabicText,
        englishTranslation: verse.englishTranslation,
        surahNameArabic: verse.surahNameArabic,
        surahNameEnglish: verse.surahNameEnglish,
        createdAt: verse.createdAt.toISOString(),
      };
    } catch (error) {
      app.logger.error(
        { err: error, body: request.body },
        'Failed to add Quran verse'
      );
      return reply.code(500).send({
        error: 'Failed to add Quran verse',
      });
    }
  });

  // POST /api/quran/seed - Seed the database with pre-defined verses
  fastify.post('/api/quran/seed', {
    schema: {
      description: 'Seed database with 30 authentic Quran verses',
      tags: ['quran'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            count: { type: 'number' },
          },
        },
        500: { type: 'object' },
      },
    },
  }, async (request, reply) => {
    app.logger.info({}, 'Seeding Quran verses');

    try {
      // Check if verses already exist
      const existingVerses = await app.db.select().from(schema.quranVerses);

      if (existingVerses.length > 0) {
        app.logger.info(
          { existingCount: existingVerses.length },
          'Verses already exist in database'
        );
        return {
          message: 'Database already contains verses',
          count: existingVerses.length,
        };
      }

      // Insert all seed verses
      const insertedVerses = await app.db
        .insert(schema.quranVerses)
        .values(SEED_VERSES)
        .returning();

      app.logger.info(
        { count: insertedVerses.length },
        'Quran verses seeded successfully'
      );

      return {
        message: 'Successfully seeded Quran verses',
        count: insertedVerses.length,
      };
    } catch (error) {
      app.logger.error(
        { err: error },
        'Failed to seed Quran verses'
      );
      return reply.code(500).send({
        error: 'Failed to seed Quran verses',
      });
    }
  });
}
