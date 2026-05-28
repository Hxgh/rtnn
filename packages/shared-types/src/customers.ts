import type { PaginationQuery } from "./pagination";

export type CustomerStatus = "active" | "inactive" | "blocked";

export interface LabeledReference {
  id: string;
  name: string;
}

export interface CustomerGroupSummary {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  customerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerTagSummary {
  id: string;
  name: string;
  color?: string | null;
  usageCount?: number;
  customerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  id: string;
  accountId: string;
  email: string;
  name: string;
  status: CustomerStatus;
  tenantId: string | null;
  phone?: string | null;
  groups: LabeledReference[];
  tags: LabeledReference[];
  groupNames?: string[];
  tagNames?: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends CustomerSummary {
  notes?: string | null;
}

export interface CustomerListQuery extends PaginationQuery {
  search?: string;
  status?: CustomerStatus;
  groupId?: string;
  tagId?: string;
}

export interface CreateCustomerInput {
  email: string;
  name?: string;
  password: string;
  phone?: string;
  tenantId?: string;
  groupIds?: string[];
  tagIds?: string[];
}

export interface UpdateCustomerInput {
  name?: string;
  password?: string;
  phone?: string;
  groupIds?: string[];
  tagIds?: string[];
}

export interface UpdateCustomerStatusInput {
  status: CustomerStatus;
}

export interface ResetCustomerPasswordInput {
  nextPassword: string;
}

export interface CreateCustomerGroupInput {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateCustomerGroupInput {
  name?: string;
  slug?: string;
  description?: string;
}

export interface CreateCustomerTagInput {
  name: string;
  slug?: string;
  color?: string;
  description?: string;
}

export interface UpdateCustomerTagInput {
  name?: string;
  slug?: string;
  color?: string | null;
  description?: string;
}
