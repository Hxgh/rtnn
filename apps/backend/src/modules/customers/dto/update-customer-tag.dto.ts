import { PartialType } from '@nestjs/swagger';
import { CreateCustomerTagDto } from './create-customer-tag.dto';

export class UpdateCustomerTagDto extends PartialType(CreateCustomerTagDto) {}
