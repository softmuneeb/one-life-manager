/**
 * Memory Cleanup Service
 * Handles memory optimization and cleanup tasks for cloud deployments
 */
export class MemoryCleanupService {
  private static instance: MemoryCleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly MEMORY_THRESHOLD_MB = 400;
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): MemoryCleanupService {
    if (!MemoryCleanupService.instance) {
      MemoryCleanupService.instance = new MemoryCleanupService();
    }
    return MemoryCleanupService.instance;
  }

  /**
   * Start automatic memory cleanup monitoring
   */
  public startAutoCleanup(): void {
    if (this.cleanupInterval) {
      return; // Already running
    }

    console.log('🧹 Starting automatic memory cleanup service...');
    
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL_MS);

    // Initial cleanup
    this.performCleanup();
  }

  /**
   * Stop automatic memory cleanup
   */
  public stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Stopped automatic memory cleanup service');
    }
  }

  /**
   * Perform memory cleanup operations
   */
  public performCleanup(): void {
    const memUsage = process.memoryUsage();
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    console.log(`🔍 Memory check: ${rssMB}MB RSS, ${heapUsedMB}MB Heap`);

    // Force garbage collection if memory usage is high
    if (rssMB > this.MEMORY_THRESHOLD_MB) {
      this.forceGarbageCollection();
      this.clearNodeModulesCache();
      this.optimizeBuffers();
    }

    // Log memory stats
    this.logMemoryStats();
  }

  /**
   * Force garbage collection if available
   */
  private forceGarbageCollection(): void {
    if (global.gc) {
      console.log('🗑️ Forcing garbage collection...');
      const beforeMem = process.memoryUsage().rss;
      global.gc();
      const afterMem = process.memoryUsage().rss;
      const freedMB = Math.round((beforeMem - afterMem) / 1024 / 1024);
      console.log(`✅ Garbage collection freed ${freedMB}MB`);
    } else {
      console.log('⚠️ Garbage collection not available (run with --expose-gc)');
    }
  }

  /**
   * Clear Node.js require cache for non-core modules
   */
  private clearNodeModulesCache(): void {
    const moduleCount = Object.keys(require.cache).length;
    let clearedCount = 0;

    Object.keys(require.cache).forEach(key => {
      // Only clear non-core modules and avoid clearing our own app modules
      if (key.includes('node_modules') && 
          !key.includes('whatsapp-web.js') && 
          !key.includes('mongoose') &&
          !key.includes('express')) {
        delete require.cache[key];
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      console.log(`🧹 Cleared ${clearedCount}/${moduleCount} cached modules`);
    }
  }

  /**
   * Optimize Node.js buffers
   */
  private optimizeBuffers(): void {
    // Force buffer cleanup
    if (Buffer.poolSize) {
      Buffer.poolSize = 8192; // Reduce buffer pool size
    }
  }

  /**
   * Get detailed memory statistics
   */
  private logMemoryStats(): void {
    const memUsage = process.memoryUsage();
    const v8HeapStats = require('v8').getHeapStatistics();
    
    const stats = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      heapLimit: Math.round(v8HeapStats.heap_size_limit / 1024 / 1024),
      uptime: Math.round(process.uptime() / 60) // in minutes
    };

    console.log(`📊 Memory Stats: RSS=${stats.rss}MB, Heap=${stats.heapUsed}/${stats.heapTotal}MB (limit: ${stats.heapLimit}MB), External=${stats.external}MB, Uptime=${stats.uptime}min`);
    
    // Warn if approaching limits
    if (stats.rss > this.MEMORY_THRESHOLD_MB) {
      console.warn(`⚠️ HIGH MEMORY WARNING: RSS usage ${stats.rss}MB exceeds threshold ${this.MEMORY_THRESHOLD_MB}MB`);
    }
  }

  /**
   * Get current memory optimization recommendations
   */
  public getOptimizationRecommendations(): string[] {
    const memUsage = process.memoryUsage();
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const recommendations: string[] = [];

    if (rssMB > 300) {
      recommendations.push('Consider restarting the application to clear accumulated memory');
    }

    if (rssMB > 400) {
      recommendations.push('URGENT: Memory usage is critically high');
      recommendations.push('Check for memory leaks in application code');
    }

    if (!global.gc) {
      recommendations.push('Run with --expose-gc flag to enable manual garbage collection');
    }

    if (process.env.NODE_ENV !== 'production') {
      recommendations.push('Set NODE_ENV=production to optimize memory usage');
    }

    return recommendations;
  }
}