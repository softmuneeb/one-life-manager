/**
 * Memory Monitor Service for tracking RAM and disk usage
 */
export class MemoryMonitorService {
  private static instance: MemoryMonitorService;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): MemoryMonitorService {
    if (!MemoryMonitorService.instance) {
      MemoryMonitorService.instance = new MemoryMonitorService();
    }
    return MemoryMonitorService.instance;
  }

  /**
   * Get current memory usage information
   */
  public getMemoryUsage(): {
    heap: { used: number; total: number; limit: number; usedMB: number; totalMB: number; usagePercent: number };
    system: { rss: number; external: number; rssMB: number; externalMB: number };
    process: { uptime: number; pid: number; platform: string; arch: string };
  } {
    const memUsage = process.memoryUsage();
    const heapLimit = require('v8').getHeapStatistics().heap_size_limit;
    
    return {
      heap: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal, 
        limit: heapLimit,
        usedMB: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        totalMB: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        usagePercent: Math.round((memUsage.heapUsed / heapLimit) * 100 * 100) / 100
      },
      system: {
        rss: memUsage.rss, // Resident Set Size - total memory allocated
        external: memUsage.external, // C++ objects bound to JS
        rssMB: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
        externalMB: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
      },
      process: {
        uptime: Math.round(process.uptime()),
        pid: process.pid,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  /**
   * Get disk usage information (Unix systems)
   */
  public async getDiskUsage(): Promise<{
    available: number;
    used: number;
    total: number;
    usagePercent: number;
    availableMB: number;
    usedMB: number;
    totalMB: number;
  } | null> {
    try {
      const { execSync } = require('child_process');
      const output = execSync('df -h /', { encoding: 'utf8' });
      const lines = output.split('\n');
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      
      // Parse df output: Filesystem Size Used Avail Use% Mounted
      const totalStr = parts[1];
      const usedStr = parts[2];
      const availStr = parts[3];
      const usePercent = parseInt(parts[4].replace('%', ''));
      
      return {
        total: this.parseSize(totalStr),
        used: this.parseSize(usedStr),
        available: this.parseSize(availStr),
        usagePercent: usePercent,
        totalMB: Math.round(this.parseSize(totalStr) / 1024 / 1024),
        usedMB: Math.round(this.parseSize(usedStr) / 1024 / 1024), 
        availableMB: Math.round(this.parseSize(availStr) / 1024 / 1024)
      };
    } catch (error) {
      console.log('⚠️  Could not get disk usage information:', error);
      return null;
    }
  }

  /**
   * Parse size string from df command (e.g., "1.5G" -> bytes)
   */
  private parseSize(sizeStr: string): number {
    const units = { 'K': 1024, 'M': 1024 * 1024, 'G': 1024 * 1024 * 1024, 'T': 1024 * 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)([KMGT]?)$/);
    if (!match || !match[1]) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2] as keyof typeof units;
    return Math.round(value * (units[unit] || 1));
  }

  /**
   * Log current memory and disk usage
   */
  public async logCurrentUsage(): Promise<void> {
    const memory = this.getMemoryUsage();
    const disk = await this.getDiskUsage();

    console.log('📊 Memory & Disk Usage Report:');
    console.log('═══════════════════════════════════════');
    console.log(`💾 RAM Usage:`);
    console.log(`   • Heap Used: ${memory.heap.usedMB} MB (${memory.heap.usagePercent}%)`);
    console.log(`   • Heap Total: ${memory.heap.totalMB} MB`);
    console.log(`   • RSS (Total): ${memory.system.rssMB} MB`);
    console.log(`   • External: ${memory.system.externalMB} MB`);
    
    if (disk) {
      console.log(`💿 Disk Usage:`);
      console.log(`   • Used: ${disk.usedMB} MB (${disk.usagePercent}%)`);
      console.log(`   • Available: ${disk.availableMB} MB`);
      console.log(`   • Total: ${disk.totalMB} MB`);
    }
    
    console.log(`⚙️  Process Info:`);
    console.log(`   • PID: ${memory.process.pid}`);
    console.log(`   • Uptime: ${memory.process.uptime}s`);
    console.log(`   • Platform: ${memory.process.platform} (${memory.process.arch})`);
    console.log('═══════════════════════════════════════');

    // Warning if approaching limits
    if (memory.system.rssMB > 400) {
      console.log('⚠️  WARNING: RAM usage > 400MB (approaching 512MB Render limit!)');
    }
    
    if (disk && disk.usagePercent > 80) {
      console.log('⚠️  WARNING: Disk usage > 80%');
    }
  }

  /**
   * Start periodic memory monitoring
   */
  public startMonitoring(intervalMinutes: number = 5): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    console.log(`🔍 Starting memory monitoring (every ${intervalMinutes} minutes)`);
    
    // Log initial usage
    this.logCurrentUsage();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.logCurrentUsage();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop periodic monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Memory monitoring stopped');
    }
  }

  /**
   * Force garbage collection if available
   */
  public forceGarbageCollection(): void {
    if (global.gc) {
      console.log('🗑️  Forcing garbage collection...');
      global.gc();
      console.log('✅ Garbage collection completed');
    } else {
      console.log('ℹ️  Garbage collection not available (run with --expose-gc flag)');
    }
  }

  /**
   * Get memory usage summary for API/logging
   */
  public getUsageSummary(): { ramUsageMB: number; ramLimitMB: number; ramUsagePercent: number; diskUsagePercent: number | null } {
    const memory = this.getMemoryUsage();
    return {
      ramUsageMB: memory.system.rssMB,
      ramLimitMB: 512, // Render free/starter limit
      ramUsagePercent: Math.round((memory.system.rssMB / 512) * 100),
      diskUsagePercent: null // Will be filled by disk check
    };
  }
}