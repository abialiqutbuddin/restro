import { ArrayNotEmpty, IsArray } from "class-validator";

// --- optional bulk dto ---
export class ArchiveManyDto {
  @IsArray()
  @ArrayNotEmpty()
  ids!: number[];
}