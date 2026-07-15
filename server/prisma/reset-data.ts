import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Clears all transactional RSP/L&D data so you can build everything from scratch in the app,
 * while KEEPING login accounts, LGUs, and departments (so you can still sign in and assign
 * positions to departments).
 *
 * Kept:    lgus, users, departments, personal_data_sheets, work_experience_sheets
 * Cleared: position catalog, publications, positions + requirements, applications + documents,
 *          interviews, assessments, appointments + final requirements, trainings, audit logs
 *
 * Run with:  npx prisma db execute (no) — use:  npm run db:reset-data
 */
async function main() {
  console.log('Resetting transactional data (keeping accounts, LGUs, departments)...');

  // FK-safe deletion order.
  await prisma.trainingParticipant.deleteMany();
  await prisma.training.deleteMany();
  await prisma.finalRequirement.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.assessmentScore.deleteMany();
  await prisma.interviewScheduleApplicant.deleteMany();
  await prisma.interviewSchedule.deleteMany();
  await prisma.applicationDocument.deleteMany();
  await prisma.application.deleteMany();
  await prisma.positionDocumentRequirement.deleteMany();
  await prisma.position.deleteMany();
  await prisma.positionCatalogRequirement.deleteMany();
  await prisma.positionCatalog.deleteMany();
  await prisma.publication.deleteMany();
  await prisma.auditLog.deleteMany();

  const [lgus, users, departments] = await Promise.all([
    prisma.lgu.count(),
    prisma.user.count(),
    prisma.department.count(),
  ]);

  console.log('Done. Cleared: catalog, publications, positions, applications, pipeline, trainings, audit logs.');
  console.log(`Kept: ${lgus} LGUs, ${users} users, ${departments} departments (+ PDS/WES on file).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
