import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// ─── Seed Data ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'pl', label: 'Polski' },
  { code: 'ro', label: 'Română' },
  { code: 'es', label: 'Español' },
] as const;

const ADMIN_EMAIL = 'admin@i18n-chat.local';
const ADMIN_PASSWORD = 'Admin1234!'; // Changed on first login in production

/**
 * Seeds the database with initial reference data:
 * - 8 supported languages
 * - 1 admin user
 * - 1 sample template with FR, NL and EN translations
 *
 * Safe to run multiple times (upsert strategy).
 */
async function main(): Promise<void> {
  console.warn('🌱 Seeding database…');

  // ── Languages ──────────────────────────────────────────────────────────────
  console.warn('  → Upserting languages…');
  await Promise.all(
    LANGUAGES.map((language) =>
      prisma.language.upsert({
        where: { code: language.code },
        update: { label: language.label },
        create: { code: language.code, label: language.label },
      }),
    ),
  );

  // ── Admin user ─────────────────────────────────────────────────────────────
  console.warn('  → Upserting admin user…');
  const passwordHash = await argon2.hash(ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: UserRole.ADMIN,
      preferredLanguageCode: 'fr',
    },
  });

  // ── Sample template ────────────────────────────────────────────────────────
  console.warn('  → Upserting sample template…');
  const template = await prisma.template.upsert({
    where: { slug: 'appointment_reminder' },
    update: {},
    create: {
      slug: 'appointment_reminder',
      category: 'administrative',
      createdById: admin.id,
      variables: {
        create: [
          { key: 'prenom', label: 'Prénom du destinataire', isRequired: true },
          { key: 'date', label: 'Date du rendez-vous', isRequired: true },
          { key: 'lieu', label: 'Lieu du rendez-vous', isRequired: false },
        ],
      },
    },
  });

  const translations = [
    {
      languageCode: 'fr',
      subject: 'Rappel de rendez-vous',
      body: 'Bonjour {{prenom}}, votre rendez-vous est confirmé pour le {{date}} à {{lieu}}.',
    },
    {
      languageCode: 'nl',
      subject: 'Herinnering aan uw afspraak',
      body: 'Beste {{prenom}}, uw afspraak is bevestigd op {{date}} in {{lieu}}.',
    },
    {
      languageCode: 'en',
      subject: 'Appointment reminder',
      body: 'Hello {{prenom}}, your appointment is confirmed for {{date}} at {{lieu}}.',
    },
  ];

  await Promise.all(
    translations.map((translation) =>
      prisma.templateTranslation.upsert({
        where: {
          templateId_languageCode: {
            templateId: template.id,
            languageCode: translation.languageCode,
          },
        },
        update: { subject: translation.subject, body: translation.body },
        create: {
          templateId: template.id,
          languageCode: translation.languageCode,
          subject: translation.subject,
          body: translation.body,
        },
      }),
    ),
  );

  console.warn('✅ Seed complete.');
  console.warn(`   Admin credentials: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.warn('   ⚠  Change the admin password immediately in production.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
