import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GeoJSON } from 'geojson';

@Entity()
export class Alert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column({ nullable: true })
  alertName: string;

  // Configuration of the type
  // TODO - Use type from frontend
  /*
  {
    "type": "wms",
    "server_layer_name": "ModisLST",
    "base_url": "https://mongolia.sibelius-datacube.org:5000",
    "wcsConfig": {
      "scale": 0.02,
      "offset": -273,
      "pixelResolution": 64
    }
  }
  */
  @Column({ type: 'json' })
  alertConfig: any;

  @Column({ nullable: true })
  min: number;

  @Column({ nullable: true })
  max: number;

  @Column({
    type: 'geometry',
    unique: true,
    srid: 4326,
    nullable: true,
  })
  @Index({ spatial: true })
  zones: GeoJSON[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastTriggered: Date;
}
