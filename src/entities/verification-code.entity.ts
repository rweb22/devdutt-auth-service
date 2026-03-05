import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('verification_codes')
export class VerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mobile_number', length: 15 })
  mobileNumber: string;

  @Column({ length: 6 })
  code: string;

  @Column({ length: 50 })
  purpose: string; // 'REGISTRATION', 'PASSWORD_RESET', 'MOBILE_VERIFICATION'

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

