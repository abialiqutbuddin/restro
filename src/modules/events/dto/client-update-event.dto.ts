import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ImportCateringDto } from './import-events.dto';

export class ClientUpdateEventDto {
    @IsOptional() @IsInt() @Type(() => Number) headcountEst?: number;
    @IsOptional() @IsString() notes?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportCateringDto)
    caterings?: ImportCateringDto[];
}
