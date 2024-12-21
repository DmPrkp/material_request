import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class HandTool {
  @IsString()
  name: string;

  // Add other fields with validation rules
}

export class Material {
  @IsString()
  title: string;

  // Add other fields with validation rules
}

export class PowerTool {
  @IsString()
  model: string;

  // Add other fields with validation rules
}

export class CreateZayavkaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HandTool)
  hand_tools: HandTool[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Material)
  materials: Material[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PowerTool)
  power_tools: PowerTool[];
}
