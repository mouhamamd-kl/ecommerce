// import { Module } from '@nestjs/common';
// import { AppController } from './app.controller.js';
// import { AppService } from './app.service.js';

// @Module({
//   imports: [],
//   controllers: [AppController],
//   providers: [AppService],
// })
// export class AppModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432, // Portul implicit pentru PostgreSQL
      username: 'postgres',
      password: 'admin',
      database: 'ecommerce',
      entities: [],
      synchronize: false, // Folosește false în producție ca să nu pierzi date!
    }),

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
