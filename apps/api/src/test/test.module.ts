import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TestController } from './test.controller';
import { TestService } from './test.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'changeme',
        signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as never },
      }),
    }),
  ],
  controllers: [TestController],
  providers: [TestService],
})
export class TestModule {}
