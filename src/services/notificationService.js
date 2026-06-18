const { CareTask, CareGoal, EverCareEnrollment } = require('../models');
const { Op } = require('sequelize');
const {
  sendTaskReminder,
  sendGoalProgressUpdate,
  sendEverCareNotification,
} = require('./integrationService');

// Send daily task reminders
async function sendDailyTaskReminders() {
  try {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    // Get all tasks due today
    const tasksDueToday = await CareTask.findAll({
      where: {
        due_date: {
          [Op.gte]: startOfDay,
          [Op.lt]: endOfDay,
        },
        status: {
          [Op.in]: ['pending', 'in_progress'],
        },
        reminder_enabled: true,
      },
      include: [
        {
          model: CareGoal,
          as: 'goal',
          attributes: ['title', 'category'],
        },
      ],
    });

    // Group tasks by patient
    const tasksByPatient = groupTasksByPatient(tasksDueToday);

    // Send reminders for each patient
    const sentReminders = [];
    for (const [patientId, tasks] of Object.entries(tasksByPatient)) {
      try {
        for (const task of tasks) {
          const reminder = await sendTaskReminder(patientId, task);
          sentReminders.push(reminder);
        }
      } catch (error) {
        console.error(
          `Failed to send reminders for patient ${patientId}:`,
          error.message,
        );
      }
    }

    return {
      message: `Sent ${sentReminders.length} daily task reminders`,
      sentCount: sentReminders.length,
      totalTasks: tasksDueToday.length,
    };
  } catch (error) {
    throw new Error(`Failed to send daily task reminders: ${error.message}`);
  }
}

// Send overdue task notifications
async function sendOverdueTaskNotifications() {
  try {
    const now = new Date();

    // Get all overdue tasks
    const overdueTasks = await CareTask.findAll({
      where: {
        due_date: {
          [Op.lt]: now,
        },
        status: {
          [Op.in]: ['pending', 'in_progress'],
        },
        reminder_enabled: true,
      },
      include: [
        {
          model: CareGoal,
          as: 'goal',
          attributes: ['title', 'category'],
        },
      ],
    });

    // Group tasks by patient
    const tasksByPatient = groupTasksByPatient(overdueTasks);

    // Send overdue notifications for each patient
    const sentNotifications = [];
    for (const [patientId, tasks] of Object.entries(tasksByPatient)) {
      try {
        const notifications = await sendOverdueNotifications(patientId, tasks);
        sentNotifications.push(...notifications);
      } catch (error) {
        console.error(
          `Failed to send overdue notifications for patient ${patientId}:`,
          error.message,
        );
      }
    }

    return {
      message: `Sent ${sentNotifications.length} overdue task notifications`,
      sentCount: sentNotifications.length,
      totalOverdueTasks: overdueTasks.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to send overdue task notifications: ${error.message}`,
    );
  }
}

// Send goal progress notifications
async function sendGoalProgressNotifications() {
  try {
    // Get goals with significant progress changes
    const goalsWithProgress = await CareGoal.findAll({
      where: {
        status: 'active',
        progress_percentage: {
          [Op.gte]: 25, // Notify when progress is 25% or more
        },
      },
      include: [
        {
          model: CareTask,
          as: 'tasks',
          where: {
            status: 'completed',
            updated_at: {
              [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        },
      ],
    });

    const sentNotifications = [];
    for (const goal of goalsWithProgress) {
      try {
        const notification = await sendGoalProgressUpdate(
          goal.patient_id,
          goal,
        );
        sentNotifications.push(notification);
      } catch (error) {
        console.error(
          `Failed to send progress notification for goal ${goal.goal_id}:`,
          error.message,
        );
      }
    }

    return {
      message: `Sent ${sentNotifications.length} goal progress notifications`,
      sentCount: sentNotifications.length,
      totalGoals: goalsWithProgress.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to send goal progress notifications: ${error.message}`,
    );
  }
}

// Send enrollment renewal reminders
async function sendEnrollmentRenewalReminders() {
  try {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Get enrollments expiring in 30 days
    const expiringEnrollments = await EverCareEnrollment.findAll({
      where: {
        status: 'active',
        next_review_date: {
          [Op.lte]: thirtyDaysFromNow,
        },
      },
    });

    const sentReminders = [];
    for (const enrollment of expiringEnrollments) {
      try {
        const reminderData = {
          conversation_id: null, // Will be created by communication service
          sender_id: 'system',
          receiver_id: enrollment.patient_id,
          content: `Your Ever Care Program enrollment will be reviewed on ${new Date(enrollment.next_review_date).toLocaleDateString()}. Please schedule your review appointment to continue receiving care.`,
          messageType: 'enrollment_renewal',
          priority: 'high',
        };

        const reminder = await sendEverCareNotification(reminderData);
        sentReminders.push(reminder);
      } catch (error) {
        console.error(
          `Failed to send renewal reminder for patient ${enrollment.patient_id}:`,
          error.message,
        );
      }
    }

    return {
      message: `Sent ${sentReminders.length} enrollment renewal reminders`,
      sentCount: sentReminders.length,
      totalExpiring: expiringEnrollments.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to send enrollment renewal reminders: ${error.message}`,
    );
  }
}

// Send weekly summary notifications
async function sendWeeklySummaryNotifications() {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get all active enrollments
    const activeEnrollments = await EverCareEnrollment.findAll({
      where: { status: 'active' },
      include: [
        {
          model: CareGoal,
          as: 'careGoals',
          include: [
            {
              model: CareTask,
              as: 'tasks',
              where: {
                updated_at: {
                  [Op.gte]: oneWeekAgo,
                },
              },
            },
          ],
        },
      ],
    });

    const sentSummaries = [];
    for (const enrollment of activeEnrollments) {
      try {
        const summary = await generateWeeklySummary(enrollment);
        const summaryData = {
          conversation_id: null,
          sender_id: 'system',
          receiver_id: enrollment.patient_id,
          content: summary,
          messageType: 'weekly_summary',
          priority: 'normal',
        };

        const summaryNotification = await sendEverCareNotification(summaryData);
        sentSummaries.push(summaryNotification);
      } catch (error) {
        console.error(
          `Failed to send weekly summary for patient ${enrollment.patient_id}:`,
          error.message,
        );
      }
    }

    return {
      message: `Sent ${sentSummaries.length} weekly summary notifications`,
      sentCount: sentSummaries.length,
      totalPatients: activeEnrollments.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to send weekly summary notifications: ${error.message}`,
    );
  }
}

// Send custom notifications
async function sendCustomNotification(patientId, notificationData) {
  try {
    const customNotification = await sendEverCareNotification({
      conversation_id: notificationData.conversation_id,
      sender_id: 'system',
      receiver_id: patientId,
      content: notificationData.content,
      messageType: notificationData.messageType || 'custom',
      priority: notificationData.priority || 'normal',
    });

    return customNotification;
  } catch (error) {
    throw new Error(`Failed to send custom notification: ${error.message}`);
  }
}

// Helper function to group tasks by patient
function groupTasksByPatient(tasks) {
  const tasksByPatient = {};

  for (const task of tasks) {
    if (!tasksByPatient[task.patient_id]) {
      tasksByPatient[task.patient_id] = [];
    }
    tasksByPatient[task.patient_id].push(task);
  }

  return tasksByPatient;
}

// Helper function to send overdue notifications
async function sendOverdueNotifications(patientId, tasks) {
  const notifications = [];

  for (const task of tasks) {
    try {
      const overdueData = {
        conversation_id: null,
        sender_id: 'system',
        receiver_id: patientId,
        content: `URGENT: Your task "${task.title}" from goal "${task.goal.title}" is overdue. Please complete it as soon as possible.`,
        messageType: 'overdue_notification',
        priority: 'urgent',
      };

      const notification = await sendEverCareNotification(overdueData);
      notifications.push(notification);
    } catch (error) {
      console.error(
        `Failed to send overdue notification for task ${task.task_id}:`,
        error.message,
      );
    }
  }

  return notifications;
}

// Helper function to generate weekly summary
async function generateWeeklySummary(enrollment) {
  const goals = enrollment.careGoals || [];
  let completedTasks = 0;
  let totalTasks = 0;
  let progressSummary = '';

  for (const goal of goals) {
    const tasks = goal.tasks || [];
    totalTasks += tasks.length;

    const goalCompletedTasks = tasks.filter(
      (task) => task.status === 'completed',
    ).length;
    completedTasks += goalCompletedTasks;

    if (goalCompletedTasks > 0) {
      progressSummary += `\n• ${goal.title}: ${goalCompletedTasks} task(s) completed`;
    }
  }

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return `Weekly Summary for Ever Care Program:
  
This week you completed ${completedTasks} out of ${totalTasks} tasks (${completionRate}% completion rate).
${progressSummary}

Keep up the great work on your health journey! 🎯`;
}

// Schedule all notification types
async function scheduleAllNotifications() {
  try {
    const results = {
      dailyReminders: null,
      overdueNotifications: null,
      progressNotifications: null,
      renewalReminders: null,
      weeklySummaries: null,
    };

    // Send daily task reminders
    try {
      results.dailyReminders = await sendDailyTaskReminders();
    } catch (error) {
      console.error('Failed to send daily reminders:', error.message);
    }

    // Send overdue task notifications
    try {
      results.overdueNotifications = await sendOverdueTaskNotifications();
    } catch (error) {
      console.error('Failed to send overdue notifications:', error.message);
    }

    // Send goal progress notifications
    try {
      results.progressNotifications = await sendGoalProgressNotifications();
    } catch (error) {
      console.error('Failed to send progress notifications:', error.message);
    }

    // Send enrollment renewal reminders
    try {
      results.renewalReminders = await sendEnrollmentRenewalReminders();
    } catch (error) {
      console.error('Failed to send renewal reminders:', error.message);
    }

    // Send weekly summary notifications (only on specific days)
    const today = new Date();
    if (today.getDay() === 0) {
      // Sunday
      try {
        results.weeklySummaries = await sendWeeklySummaryNotifications();
      } catch (error) {
        console.error('Failed to send weekly summaries:', error.message);
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to schedule notifications: ${error.message}`);
  }
}

module.exports = {
  sendDailyTaskReminders,
  sendOverdueTaskNotifications,
  sendGoalProgressNotifications,
  sendEnrollmentRenewalReminders,
  sendWeeklySummaryNotifications,
  sendCustomNotification,
  scheduleAllNotifications,
};
