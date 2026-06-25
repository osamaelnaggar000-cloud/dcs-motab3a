<div align="center">
<img width="1200" height="475" alt="DCS Logo" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# برنامج الصيانة - شركة الدلتا للسكر

تطبيق ويب تفاعلي لإدارة جداول الصيانة (Gantt Chart) مع إمكانيات متقدمة لتتبع الموارد البشرية والعطل الرسمية والغيابات.

## ✨ الميزات الرئيسية

- **رسوم Gantt تفاعلية**: تصور شامل للمشاريع والمهام مع تتبع التقدم
- **إدارة الموارد البشرية**: تنظيم الموظفين والفنيين والعمال
- **تتبع الغيابات والعطل**: إدارة الإجازات والغيابات والعطل الرسمية
- **التقارير والتصدير**: تصدير البيانات وطباعة التقارير
- **النسخ الاحتياطي والاستعادة**: حفظ واستعادة البيانات بسهولة
- **تطبيق ويب تقدمي (PWA)**: إمكانية التثبيت على الأجهزة

## المتطلبات

- Node.js 16+ 
- npm أو yarn

## التثبيت والتشغيل

### 1. تثبيت المتعلقات
```bash
npm install
```

### 2. إعداد متغيرات البيئة
أنشئ ملف `.env.local` في جذر المشروع بالبيانات التالية:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

**ملاحظة أمنية مهمة:** 
- ✅ تم نقل بيانات Firebase الحساسة إلى `.env.local`
- ✅ لا تقم بحفظ `.env.local` في نظام التحكم بالإصدارات
- ✅ تأكد من أن `.gitignore` يتضمن `*.local`

### 3. تشغيل التطبيق

**وضع التطوير:**
```bash
npm run dev
```
سيكون التطبيق متاحاً على `http://localhost:3001`

**بناء الإنتاج:**
```bash
npm run build
```

**معاينة الإنتاج:**
```bash
npm run preview
```

## النشر على الويب

### الخيارات الموصى بها:

#### 1. **Vercel** (الأفضل للتطبيقات React)
```bash
npm install -g vercel
vercel
```
- ربط متغيرات البيئة في لوحة التحكم
- النشر التلقائي عند كل push

#### 2. **Netlify**
```bash
npm install -g netlify-cli
netlify deploy
```

#### 3. **Firebase Hosting**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

#### 4. **أي استضافة ويب تدعم Node.js**
```bash
npm run build
# انسخ محتويات مجلد `dist/` إلى خادمك
```

## البنية الأساسية للمشروع

```
src/
├── components/          # مكونات React
├── hooks/              # Custom hooks لإدارة الحالة
├── utils/              # دوال مساعدة
├── App.tsx             # المكون الرئيسي
├── firebase.ts         # إعدادات Firebase
├── types.ts            # تعريفات TypeScript
└── index.tsx           # نقطة الدخول

public/
├── manifest.json       # إعدادات PWA
└── icons/             # أيقونات التطبيق
```

## المصادقة والأمان

- تطبيق يحتاج إلى تسجيل دخول عبر Firebase Auth
- يدعم تسجيل الدخول بـ Google و البريد الإلكتروني
- البيانات محمية في Firestore مع قواعد أمان مخصصة

## استكشاف الأخطاء

### المشكلة: "Missing Firebase Configuration"
**الحل:** تأكد من إضافة جميع متغيرات البيئة في `.env.local`

### المشكلة: التطبيق بطيء
**الحل:** استخدم `npm run build` للإنتاج قبل النشر

### المشكلة: مشاكل في PWA
**الحل:** امسح ذاكرة التخزين المؤقت للمتصفح والـ Service Worker

## الدعم والمساهمة

للإبلاغ عن أخطاء أو طلب ميزات جديدة، يرجى فتح issue جديدة.

---

**الإصدار:** 1.0.0  
**آخر تحديث:** مارس 2026
