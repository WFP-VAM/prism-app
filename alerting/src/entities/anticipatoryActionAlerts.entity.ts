import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class AnticipatoryActionAlerts {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  country: string;

  @Column({
    type: 'enum',
    enum: ['storm', 'flood', 'drought'],
    default: 'storm',
  })
  type: 'storm' | 'flood' | 'drought';

  @Column({ type: 'text', array: true })
  emails: string[];

  @Column()
  prismUrl: string;

  @Column({ nullable: true })
  lastTriggeredAt?: Date;

  @Column()
  lastRanAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  lastStates?: Record<string, { status: string; refTime: string }>;
}
