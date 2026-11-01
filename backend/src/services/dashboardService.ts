import { UserRole } from '../types';
import { DashboardRepository } from '../repositories';

export class DashboardService {
  static async getDashboard(userId: string, role: UserRole) {
    const [stats, upcomingClasses, latestNews] = await Promise.all([
      DashboardRepository.getStats(userId, role),
      DashboardRepository.getUpcomingClasses(userId, role),
      DashboardRepository.getLatestNews(),
    ]);
    return { stats, upcomingClasses, latestNews };
  }
}
