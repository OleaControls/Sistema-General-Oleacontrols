import prisma from '../_lib/prisma.js';
import { requireAuth } from '../_lib/auth.js';

export default async function lmsHandler(req, res) {
  const method = req.method;
  const path = req.url.split('?')[0].replace('/api/lms', '');

  console.log(`[LMS] ${method} ${path}`);

  try {
    const user = await requireAuth(req);

    // ==========================================
    // 📊 ESTADÍSTICAS PARA RH (AcademyManager)
    // ==========================================
    if (path === '/stats' && method === 'GET') {
      if (!user.roles.includes('ADMIN') && !user.roles.includes('HR_MANAGER') && !user.roles.includes('HR')) {
        return res.status(403).json({ error: 'No autorizado' });
      }
      const coursesCount = await prisma.lMSCourse.count();
      const enrollmentsCount = await prisma.lMSEnrollment.count();
      const certsCount = await prisma.lMSCertificate.count();
      return res.status(200).json({ coursesCount, enrollmentsCount, certsCount });
    }

    // ==========================================
    // 📚 MIS CURSOS (Estudiante)
    // ==========================================
    if (path === '/my-courses' && method === 'GET') {
      // Obtenemos todos los cursos publicados
      const courses = await prisma.lMSCourse.findMany({
        where: { status: 'PUBLISHED' },
        include: { 
          modules: { include: { lessons: true } },
          enrollments: {
            where: { employeeId: user.employeeId }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Mapeamos para inyectar progreso
      const mappedCourses = courses.map(c => {
        const enrollment = c.enrollments[0];
        return {
          ...c,
          isEnrolled: !!enrollment,
          progress: enrollment ? Math.round(enrollment.progressPct) : 0,
          completed: enrollment ? enrollment.status === 'COMPLETED' : false,
          enrollmentId: enrollment?.id
        };
      });

      return res.status(200).json(mappedCourses);
    }

    // ==========================================
    // ✍️ INSCRIBIR A CURSO
    // ==========================================
    if (path === '/enroll' && method === 'POST') {
      const { courseId } = req.body;
      const enrollment = await prisma.lMSEnrollment.upsert({
        where: {
          employeeId_courseId: {
            employeeId: user.employeeId,
            courseId: courseId
          }
        },
        update: {},
        create: {
          employeeId: user.employeeId,
          courseId: courseId,
          status: 'ENROLLED',
          progressPct: 0
        }
      });
      return res.status(200).json(enrollment);
    }

    // ==========================================
    // 📈 ACTUALIZAR PROGRESO
    // ==========================================
    if (path === '/progress' && method === 'POST') {
      const { courseId, lessonId, isComplete } = req.body;
      
      // Upsert progreso de lección
      if (lessonId) {
        await prisma.lMSProgress.upsert({
          where: {
            employeeId_lessonId: { employeeId: user.employeeId, lessonId }
          },
          update: { status: isComplete ? 'COMPLETED' : 'STARTED' },
          create: {
            employeeId: user.employeeId,
            lessonId,
            status: isComplete ? 'COMPLETED' : 'STARTED'
          }
        });
      }

      // Recalcular progreso total del curso
      const course = await prisma.lMSCourse.findUnique({
        where: { id: courseId },
        include: { modules: { include: { lessons: true } } }
      });

      const allLessons = course.modules.flatMap(m => m.lessons);
      const totalLessons = allLessons.length;

      const completedLessonsCount = await prisma.lMSProgress.count({
        where: {
          employeeId: user.employeeId,
          lessonId: { in: allLessons.map(l => l.id) },
          status: 'COMPLETED'
        }
      });

      const progressPct = totalLessons > 0 ? (completedLessonsCount / totalLessons) * 100 : 0;

      // Actualizar Enrollment
      await prisma.lMSEnrollment.update({
        where: { employeeId_courseId: { employeeId: user.employeeId, courseId } },
        data: { progressPct }
      });

      return res.status(200).json({ progressPct, completedLessonsCount, totalLessons });
    }

    // ==========================================
    // 🎓 FINALIZAR CURSO Y CERTIFICADO
    // ==========================================
    if (path === '/complete-course' && method === 'POST') {
      const { courseId, passedExam } = req.body;
      
      const course = await prisma.lMSCourse.findUnique({ where: { id: courseId } });

      const enrollment = await prisma.lMSEnrollment.update({
        where: { employeeId_courseId: { employeeId: user.employeeId, courseId } },
        data: { 
          status: 'COMPLETED',
          progressPct: 100,
          completedAt: new Date()
        }
      });

      let certificate = null;
      if (passedExam) {
        certificate = await prisma.lMSCertificate.create({
          data: {
            employeeId: user.employeeId,
            courseName: course.title,
            pdfUrl: `https://cert.oleacontrols.com/${Date.now()}` // Mock URL por ahora
          }
        });
      }

      return res.status(200).json({ enrollment, certificate });
    }

    // ==========================================
    // 🏗️ CRUD DE CURSOS (Admin/HR)
    // ==========================================
    if (path === '/courses' || path === '') {
      if (method === 'GET') {
        const courses = await prisma.lMSCourse.findMany({
          include: { modules: { include: { lessons: true } } },
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(courses);
      }

      if (method === 'POST') {
        if (!user.roles.includes('ADMIN') && !user.roles.includes('HR_MANAGER') && !user.roles.includes('HR')) {
          return res.status(403).json({ error: 'No autorizado' });
        }
        const { title, description, thumbnail, status, level, modules } = req.body;
        const newCourse = await prisma.lMSCourse.create({
          data: {
            title,
            description,
            thumbnail,
            status: status || 'DRAFT',
            level: level || 'BEGINNER',
            creatorId: user.employeeId,
            modules: {
              create: modules?.map((m, mIdx) => ({
                title: m.title,
                order: mIdx,
                lessons: {
                  create: m.lessons?.map((l, lIdx) => ({
                    title: l.title,
                    type: l.type,
                    content: l.content,
                    duration: parseInt(l.duration) || 10,
                    order: lIdx
                  })) || []
                }
              })) || []
            }
          },
          include: { modules: { include: { lessons: true } } }
        });
        return res.status(201).json(newCourse);
      }
    }

    if (path.match(/^\/courses\/([^\/]+)$/)) {
      const courseId = path.split('/')[2];

      if (method === 'GET') {
        const course = await prisma.lMSCourse.findUnique({
          where: { id: courseId },
          include: {
            modules: {
              include: { lessons: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' }
            }
          }
        });
        if (!course) return res.status(404).json({ error: 'Course not found' });

        // Si es estudiante, traemos el progreso de sus lecciones
        let completedLessonIds = [];
        if (!user.roles.includes('ADMIN') && !user.roles.includes('HR')) {
          const progresses = await prisma.lMSProgress.findMany({
            where: {
              employeeId: user.employeeId,
              lessonId: { in: course.modules.flatMap(m => m.lessons.map(l => l.id)) },
              status: 'COMPLETED'
            }
          });
          completedLessonIds = progresses.map(p => p.lessonId);
        }

        return res.status(200).json({ ...course, completedLessonIds });
      }
      
      if (method === 'PUT') {
        if (!user.roles.includes('ADMIN') && !user.roles.includes('HR_MANAGER') && !user.roles.includes('HR')) return res.status(403).json({ error: 'No autorizado' });
        const { title, description, thumbnail, status, level, modules } = req.body;
        
        await prisma.lMSModule.deleteMany({ where: { courseId } });

        const updatedCourse = await prisma.lMSCourse.update({
          where: { id: courseId },
          data: { 
            title, description, thumbnail, status, level,
            modules: {
              create: modules?.map((m, mIdx) => ({
                title: m.title, order: mIdx,
                lessons: {
                  create: m.lessons?.map((l, lIdx) => ({
                    title: l.title, type: l.type, content: l.content,
                    duration: parseInt(l.duration) || 10, order: lIdx
                  })) || []
                }
              })) || []
            }
          },
          include: { modules: { include: { lessons: true } } }
        });
        return res.status(200).json(updatedCourse);
      }

      if (method === 'DELETE') {
        if (!user.roles.includes('ADMIN') && !user.roles.includes('HR_MANAGER') && !user.roles.includes('HR')) return res.status(403).json({ error: 'No autorizado' });
        await prisma.lMSCourse.delete({ where: { id: courseId } });
        return res.status(204).end();
      }
    }

    return res.status(404).json({ error: 'Endpoint no encontrado en LMS' });

  } catch (error) {
    console.error("[LMS Error]", error);
    return res.status(500).json({ error: error.message });
  }
}
