/**
 * Enrollment Queue Manager
 * Tracks and manages device enrollment queue
 * Provides queue position and wait time estimates
 */

class EnrollmentQueueManager {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.currentPosition = 0;
    this.averageProcessingTime = 45000; // 45 seconds average (will be updated dynamically)
    this.processingTimes = []; // Track last 10 processing times for better estimates
    this.maxQueueSize = 150; // Maximum queue size before rejecting new requests
  }

  /**
   * Add enrollment request to queue
   * @returns {Object} Queue information
   */
  addToQueue(requestId, type = 'single') {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('QUEUE_FULL');
    }

    const queueItem = {
      id: requestId,
      type, // 'single', 'bulk', 'public'
      timestamp: Date.now(),
      position: this.queue.length + 1
    };

    this.queue.push(queueItem);

    return {
      queuePosition: queueItem.position,
      queueSize: this.queue.length,
      estimatedWaitSeconds: this.calculateEstimatedWait(queueItem.position),
      estimatedWaitMinutes: Math.ceil(this.calculateEstimatedWait(queueItem.position) / 60),
      message: this.getQueueMessage(queueItem.position)
    };
  }

  /**
   * Remove request from queue after processing
   */
  removeFromQueue(requestId) {
    const index = this.queue.findIndex(item => item.id === requestId);
    if (index > -1) {
      this.queue.splice(index, 1);
      this.currentPosition++;
    }
  }

  /**
   * Record processing time to improve estimates
   */
  recordProcessingTime(timeMs) {
    this.processingTimes.push(timeMs);
    
    // Keep only last 10 processing times
    if (this.processingTimes.length > 10) {
      this.processingTimes.shift();
    }

    // Update average
    if (this.processingTimes.length > 0) {
      const sum = this.processingTimes.reduce((a, b) => a + b, 0);
      this.averageProcessingTime = sum / this.processingTimes.length;
    }
  }

  /**
   * Calculate estimated wait time
   */
  calculateEstimatedWait(position) {
    if (position <= 1) return 0;
    
    // Position - 1 because current item is being processed
    const waitingAhead = position - 1;
    return Math.ceil((waitingAhead * this.averageProcessingTime) / 1000); // Return in seconds
  }

  /**
   * Get queue status message
   */
  getQueueMessage(position) {
    if (position === 1) {
      return 'Processing your enrollment now...';
    } else if (position <= 5) {
      return `You're next in line! ${position - 1} ${position === 2 ? 'person' : 'people'} ahead.`;
    } else if (position <= 20) {
      return `Please wait. ${position - 1} enrollments ahead of you.`;
    } else {
      return `High demand detected. ${position - 1} enrollments in queue. Please be patient.`;
    }
  }

  /**
   * Get current queue stats
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      averageProcessingTime: Math.ceil(this.averageProcessingTime / 1000),
      totalProcessed: this.currentPosition,
      isBusy: this.queue.length > 10,
      isOverloaded: this.queue.length > 50,
      status: this.getSystemStatus()
    };
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    const size = this.queue.length;
    if (size === 0) return 'IDLE';
    if (size <= 5) return 'NORMAL';
    if (size <= 20) return 'BUSY';
    if (size <= 50) return 'HEAVY_LOAD';
    return 'OVERLOADED';
  }

  /**
   * Check if queue has capacity
   */
  hasCapacity() {
    return this.queue.length < this.maxQueueSize;
  }

  /**
   * Get recommended action based on queue state
   */
  getRecommendedAction() {
    const size = this.queue.length;
    
    if (size <= 5) {
      return {
        canProceed: true,
        message: 'System is ready. You can proceed with enrollment.'
      };
    } else if (size <= 20) {
      return {
        canProceed: true,
        message: 'System is busy. Enrollment may take a few minutes.',
        suggestLater: false
      };
    } else if (size <= 50) {
      return {
        canProceed: true,
        message: 'System under heavy load. Consider trying again later for faster service.',
        suggestLater: true,
        estimatedWait: Math.ceil((size * this.averageProcessingTime) / 60000)
      };
    } else {
      return {
        canProceed: true,
        message: 'System is overloaded. We recommend trying again in 30-60 minutes.',
        suggestLater: true,
        estimatedWait: Math.ceil((size * this.averageProcessingTime) / 60000)
      };
    }
  }
}

// Singleton instance
const queueManager = new EnrollmentQueueManager();

module.exports = queueManager;
