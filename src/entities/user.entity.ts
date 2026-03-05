import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole, AccountStatus, Sex } from '@devdutt/shared';

@Entity('users')
export class User {
  @PrimaryColumn({ length: 50 })
  username: string;

  @Column({ name: 'mobile_number', length: 15, unique: true })
  mobileNumber: string;

  @Column({ name: 'mobile_number_hash', length: 255 })
  mobileNumberHash: string;

  @Column({ name: 'mobile_verified_at', type: 'timestamp', nullable: true })
  mobileVerifiedAt: Date | null;

  @Column({ name: 'password_hash', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ name: 'password_changed_at', type: 'timestamp', nullable: true })
  passwordChangedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.PUBLIC,
  })
  role: UserRole;

  @Column({
    name: 'account_status',
    type: 'varchar',
    length: 20,
    default: AccountStatus.PENDING_SETUP,
  })
  accountStatus: AccountStatus;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'full_name', length: 255, nullable: true })
  fullName: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  sex: Sex | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

