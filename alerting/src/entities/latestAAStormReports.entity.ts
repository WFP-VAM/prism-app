import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class LatestAAStormReports {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reportIdentifier: string;
}
