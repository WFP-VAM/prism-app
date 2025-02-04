import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { LastStates } from '../types/aa-storm-email';

@Entity()
export class AnticipatoryActionAlerts {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  country: string;

  @Column({ type: 'text', array: true })
  emails: string[];

  @Column()
  prismUrl: string;

  @Column({ nullable: true })
  lastTriggeredAt?: Date;

  @Column()
  lastRanAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  lastStates?: LastStates;
}
