import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CustomJwtService } from '../services/jwt.service';

@ApiTags('jwks')
@Controller('.well-known')
export class JwksController {
  constructor(private jwtService: CustomJwtService) {}

  @Get('jwks.json')
  @ApiOperation({ summary: 'Get JSON Web Key Set (JWKS)' })
  @ApiResponse({ status: 200, description: 'JWKS retrieved successfully' })
  async getJwks() {
    return this.jwtService.getJwks();
  }
}

