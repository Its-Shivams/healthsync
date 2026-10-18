import { Controller, Post, Get, Body, Res, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { UserRole } from '@healthsync/shared-types';
import {
  RegisterInput,
  RegisterPatientInput,
  RegisterDoctorInput,
  RegisterHospitalAdminInput,
  RegisterLabAdminInput,
  LoginInput,
} from '@healthsync/validation';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user (generic endpoint)' })
  @SwaggerResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() body: RegisterInput, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(body);
    this.setAuthCookie(res, result.token);
    return {
      success: true,
      message: 'Registration successful',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('register/patient')
  @ApiOperation({ summary: 'Register a new Patient with demographic and health details' })
  @SwaggerResponse({ status: 201, description: 'Patient registered successfully' })
  async registerPatient(@Body() body: RegisterPatientInput, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registerPatient(body);
    this.setAuthCookie(res, result.token);
    return {
      success: true,
      message: 'Patient registered successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('register/doctor')
  @ApiOperation({ summary: 'Register a new Doctor (pending platform verification)' })
  @SwaggerResponse({ status: 201, description: 'Doctor registered with PENDING_REVIEW status' })
  async registerDoctor(@Body() body: RegisterDoctorInput, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registerDoctor(body);
    this.setAuthCookie(res, result.token);
    return {
      success: true,
      message: 'Doctor registration submitted. Profile is PENDING_REVIEW by platform administration.',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('register/hospital-admin')
  @ApiOperation({ summary: 'Register a Hospital / Clinic Organization and Admin (unverified until approved)' })
  @SwaggerResponse({ status: 201, description: 'Hospital organization registered with UNVERIFIED status' })
  async registerHospitalAdmin(@Body() body: RegisterHospitalAdminInput, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registerHospitalAdmin(body);
    this.setAuthCookie(res, result.token);
    return {
      success: true,
      message: 'Healthcare facility registration submitted. Facility is UNVERIFIED until administrative review.',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('register/lab-admin')
  @ApiOperation({ summary: 'Register a Diagnostic Laboratory and Lab Admin (unverified until approved)' })
  @SwaggerResponse({ status: 201, description: 'Laboratory registered with UNVERIFIED status' })
  async registerLabAdmin(@Body() body: RegisterLabAdminInput, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registerLabAdmin(body);
    this.setAuthCookie(res, result.token);
    return {
      success: true,
      message: 'Diagnostic laboratory registration submitted. Lab is UNVERIFIED until administrative review.',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @SwaggerResponse({ status: 200, description: 'Authentication successful' })
  async login(@Body() body: LoginInput, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body);
    this.setAuthCookie(res, result.token);
    return {
      success: true,
      message: 'Login successful',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('demo-login')
  @ApiOperation({ summary: 'Instant demo login for synthetic roles' })
  async demoLogin(@Body('role') role: UserRole, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.demoLogin(role || UserRole.PATIENT);
    this.setAuthCookie(res, result.token);
    return {
      success: true,
      message: `Signed in as demo ${role || UserRole.PATIENT}`,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user profile and roles' })
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.authService.getCurrentUser(userId);
    return {
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Clear session authentication cookie and audit session invalidation' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as any).cookies?.healthsync_session || req.headers?.authorization?.replace('Bearer ', '');
    await this.authService.logout(token);

    res.clearCookie('healthsync_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return {
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    };
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie('healthsync_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
