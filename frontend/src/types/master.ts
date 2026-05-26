export type Warehouse = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Brand = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Product = {
  id: string;
  name: string;
  brandId: string;
  brand: { id: string; name: string; isActive: boolean };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
