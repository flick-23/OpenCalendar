// Frontend configuration for the secure canister architecture
export const SECURE_CANISTER_CONFIG = {
  // Network configuration
  network: process.env.DFX_NETWORK || 'local',
  host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4943',
  
  // Canister IDs (update these after deployment)
  canisterIds: {
    registry: process.env.CANISTER_ID_CANISTER_REGISTRY || '',
    loadBalancer: process.env.CANISTER_ID_LOAD_BALANCER || '',
    backup: process.env.CANISTER_ID_BACKUP_CANISTER || '',
    calendarSecure: process.env.CANISTER_ID_CALENDAR_CANISTER_SECURE || '',
    notification: process.env.CANISTER_ID_NOTIFICATION_CANISTER || '',
    userRegistry: process.env.CANISTER_ID_USER_REGISTRY || '',
    internetIdentity: process.env.CANISTER_ID_INTERNET_IDENTITY || 'rdmx6-jaaaa-aaaaa-aaadq-cai',
  },
  
  // Security configuration
  security: {
    groupId: 'icp-calendar-main',
    requireAuth: true,
    maxRetries: 3,
    retryDelay: 1000, // milliseconds
  },
  
  // Load balancing configuration
  loadBalancing: {
    strategy: 'RoundRobin', // 'RoundRobin' | 'LeastConnections' | 'WeightedRandom' | 'ResponseTime'
    healthCheckInterval: 30000, // 30 seconds
    maxFailures: 3,
  },
  
  // Backup configuration
  backup: {
    autoBackup: true,
    backupInterval: 300000, // 5 minutes
    retentionDays: 30,
  },
  
  // Performance monitoring
  monitoring: {
    enableMetrics: true,
    reportInterval: 60000, // 1 minute
    alertThresholds: {
      errorRate: 0.05, // 5%
      responseTime: 2000, // 2 seconds
      memoryUsage: 0.8, // 80%
    },
  },
};

// Load balancer strategy types
export type LoadBalancingStrategy = 
  | 'RoundRobin'
  | 'LeastConnections' 
  | 'WeightedRandom'
  | 'ResponseTime';

// Enhanced actor creation with load balancing
export async function createSecureActor<T>(
  canisterType: string,
  idlFactory: unknown,
  identity?: Identity
): Promise<T> {
  const { createActor } = await import('../declarations/load_balancer');
  
  try {
    // Get best canister from load balancer
    const loadBalancer = createActor(SECURE_CANISTER_CONFIG.canisterIds.loadBalancer, {
      agentOptions: { 
        host: SECURE_CANISTER_CONFIG.host,
        identity 
      }
    });
    
    const result = await loadBalancer.get_best_canister(canisterType, null);
    
    if ('ok' in result) {
      const canisterId = result.ok.toString();
      
      // Create actor for the selected canister
      return createActor(canisterId, {
        agentOptions: {
          host: SECURE_CANISTER_CONFIG.host,
          identity,
        },
      }) as T;
    } else {
      throw new Error(`No available ${canisterType} canisters: ${result.err}`);
    }
  } catch (error) {
    console.error(`Failed to create secure actor for ${canisterType}:`, error);
    throw error;
  }
}

// Fault-tolerant canister call with retry logic
export async function callWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = SECURE_CANISTER_CONFIG.security.maxRetries
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      const result = await operation();
      const responseTime = Date.now() - startTime;
      
      // Report successful call to load balancer for metrics
      if (SECURE_CANISTER_CONFIG.monitoring.enableMetrics) {
        reportMetrics(true, responseTime);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt + 1} failed:`, error);
      
      // Report failed call
      if (SECURE_CANISTER_CONFIG.monitoring.enableMetrics) {
        reportMetrics(false, 0);
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = SECURE_CANISTER_CONFIG.security.retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Report metrics to load balancer
async function reportMetrics(success: boolean, responseTime: number) {
  try {
    const { createActor } = await import('../declarations/load_balancer');
    const loadBalancer = createActor(SECURE_CANISTER_CONFIG.canisterIds.loadBalancer);
    
    // This would need to be implemented to identify which canister was called
    // For now, we'll just log the metrics
    console.debug('Metrics:', { success, responseTime, loadBalancer: !!loadBalancer });
  } catch (error) {
    // Ignore metrics reporting errors
    console.debug('Failed to report metrics:', error);
  }
}

// Health check utilities
export async function checkSystemHealth(): Promise<{
  overall: 'healthy' | 'degraded' | 'critical';
  services: Record<string, boolean>;
}> {
  const services: Record<string, boolean> = {};
  
  try {
    // Check load balancer
    const { createActor: createLBactor } = await import('../declarations/load_balancer');
    const loadBalancer = createLBactor(SECURE_CANISTER_CONFIG.canisterIds.loadBalancer);
    await loadBalancer.get_load_balancer_stats();
    services.loadBalancer = true;
  } catch {
    services.loadBalancer = false;
  }
  
  try {
    // Check calendar canister
    const { createActor: createCalActor } = await import('../declarations/calendar_canister_secure');
    const calendar = createCalActor(SECURE_CANISTER_CONFIG.canisterIds.calendarSecure);
    await calendar.health_check();
    services.calendar = true;
  } catch {
    services.calendar = false;
  }
  
  try {
    // Check backup system
    const { createActor: createBackupActor } = await import('../declarations/backup_canister');
    const backup = createBackupActor(SECURE_CANISTER_CONFIG.canisterIds.backup);
    await backup.get_backup_stats();
    services.backup = true;
  } catch {
    services.backup = false;
  }
  
  // Calculate overall health
  const healthyCount = Object.values(services).filter(Boolean).length;
  const totalCount = Object.keys(services).length;
  const healthPercentage = healthyCount / totalCount;
  
  let overall: 'healthy' | 'degraded' | 'critical';
  if (healthPercentage === 1) {
    overall = 'healthy';
  } else if (healthPercentage >= 0.7) {
    overall = 'degraded';
  } else {
    overall = 'critical';
  }
  
  return { overall, services };
}

// Auto-scaling trigger (placeholder for future implementation)
export async function checkAutoScaling(): Promise<boolean> {
  try {
    const { createActor } = await import('../declarations/load_balancer');
    const loadBalancer = createActor(SECURE_CANISTER_CONFIG.canisterIds.loadBalancer);
    const stats = await loadBalancer.get_load_balancer_stats();
    
    // Check if we need to scale based on load
    // This is a simplified check - in production you'd want more sophisticated logic
    const errorRate = stats.unhealthy_canisters / stats.total_canisters;
    
    return errorRate > SECURE_CANISTER_CONFIG.monitoring.alertThresholds.errorRate;
  } catch (error) {
    console.error('Failed to check auto-scaling conditions:', error);
    return false;
  }
}
