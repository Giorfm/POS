/**
 * @file adapters.js
 * Pola Adapter untuk integrasi platform pengantaran makanan online:
 * GoFood, GrabFood, dan ShopeeFood.
 * Menyediakan antarmuka seragam dan implementasi Mock siap uji.
 */

/**
 * Interface dasar Adapter Pengantaran Online
 */
export class BaseDeliveryAdapter {
  constructor(platformName) {
    this.platform = platformName;
  }

  /**
   * Terima pesanan masuk dari webhook platform
   * @param {Object} rawPayload
   * @returns {Promise<Object>}
   */
  async terimaPesanan(rawPayload) {
    throw new Error('Metode terimaPesanan harus diimplementasikan');
  }

  /**
   * Respon ke platform: Terima atau Tolak pesanan
   * @param {string} externalId
   * @param {'accept'|'reject'} action
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  async terimaTolak(externalId, action, reason = '') {
    throw new Error('Metode terimaTolak harus diimplementasikan');
  }

  /**
   * Update status pesanan di platform (misal: 'ready_for_pickup')
   * @param {string} externalId
   * @param {string} status
   * @returns {Promise<Object>}
   */
  async updateStatus(externalId, status) {
    throw new Error('Metode updateStatus harus diimplementasikan');
  }

  /**
   * Sinkronisasi ketersediaan menu dan harga ke platform
   * @param {Array<Object>} menuItems
   * @returns {Promise<Object>}
   */
  async sinkronMenu(menuItems) {
    throw new Error('Metode sinkronMenu harus diimplementasikan');
  }
}

// Implementasi Mock GoFood
export class GoFoodAdapter extends BaseDeliveryAdapter {
  constructor() {
    super('gofood');
  }

  async terimaPesanan(rawPayload) {
    return {
      success: true,
      platform: this.platform,
      externalId: rawPayload.order_id || `GF-${Date.now()}`,
      status: 'received',
      timestamp: new Date().toISOString(),
    };
  }

  async terimaTolak(externalId, action, reason = '') {
    return {
      success: true,
      platform: this.platform,
      externalId,
      action,
      message: action === 'accept' ? 'Pesanan GoFood diterima oleh resto' : `Pesanan ditolak: ${reason}`,
    };
  }

  async updateStatus(externalId, status) {
    return {
      success: true,
      platform: this.platform,
      externalId,
      newStatus: status,
      notifiedDriver: true,
    };
  }

  async sinkronMenu(menuItems) {
    return {
      success: true,
      platform: this.platform,
      syncedCount: menuItems.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

// Implementasi Mock GrabFood
export class GrabFoodAdapter extends BaseDeliveryAdapter {
  constructor() {
    super('grabfood');
  }

  async terimaPesanan(rawPayload) {
    return {
      success: true,
      platform: this.platform,
      externalId: rawPayload.order_id || `GRAB-${Date.now()}`,
      status: 'received',
      timestamp: new Date().toISOString(),
    };
  }

  async terimaTolak(externalId, action, reason = '') {
    return {
      success: true,
      platform: this.platform,
      externalId,
      action,
      message: action === 'accept' ? 'Pesanan GrabFood dikonfirmasi' : `Ditolak: ${reason}`,
    };
  }

  async updateStatus(externalId, status) {
    return {
      success: true,
      platform: this.platform,
      externalId,
      newStatus: status,
    };
  }

  async sinkronMenu(menuItems) {
    return {
      success: true,
      platform: this.platform,
      syncedCount: menuItems.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

// Implementasi Mock ShopeeFood
export class ShopeeFoodAdapter extends BaseDeliveryAdapter {
  constructor() {
    super('shopeefood');
  }

  async terimaPesanan(rawPayload) {
    return {
      success: true,
      platform: this.platform,
      externalId: rawPayload.order_id || `SPF-${Date.now()}`,
      status: 'received',
      timestamp: new Date().toISOString(),
    };
  }

  async terimaTolak(externalId, action, reason = '') {
    return {
      success: true,
      platform: this.platform,
      externalId,
      action,
      message: action === 'accept' ? 'Pesanan ShopeeFood siap diproses' : `Ditolak: ${reason}`,
    };
  }

  async updateStatus(externalId, status) {
    return {
      success: true,
      platform: this.platform,
      externalId,
      newStatus: status,
    };
  }

  async sinkronMenu(menuItems) {
    return {
      success: true,
      platform: this.platform,
      syncedCount: menuItems.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

/**
 * Pabrik instansiasi adapter berdasarkan nama platform
 * @param {'gofood'|'grabfood'|'shopeefood'} platform
 * @returns {BaseDeliveryAdapter}
 */
export function getDeliveryAdapter(platform) {
  switch (platform.toLowerCase()) {
    case 'gofood':
      return new GoFoodAdapter();
    case 'grabfood':
      return new GrabFoodAdapter();
    case 'shopeefood':
      return new ShopeeFoodAdapter();
    default:
      throw new Error(`Platform ${platform} tidak didukung.`);
  }
}
