export enum OrderStatus {
  PENDING = 'Pending',
  PREPARING = 'Preparing',
  READY = 'Ready',
  SERVED = 'Served',
  CANCELED = 'Canceled',
}

export enum OrderType {
  DINE_IN = 'Dine-in',
  TAKEAWAY = 'Takeaway',
  DELIVERY = 'Delivery',
}

export enum OrderPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}