import { Controller, Get, Header } from '@nestjs/common';
import { Public } from './auth/decorators';

@Public()
@Controller()
export class AppController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  getRoot(): string {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IELTSMaster ELearning API Service</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 650px; width: 100%; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 16px; }
    h1 { margin: 0 0 8px 0; font-size: 24px; color: #38bdf8; }
    p { color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0; }
    .routes { background: #0f172a; border-radius: 8px; padding: 16px; margin-top: 20px; }
    .routes h3 { margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .route-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; font-family: monospace; font-size: 13px; }
    .route-item:last-child { border-bottom: none; }
    .method { color: #38bdf8; font-weight: bold; }
    .path a { color: #f1f5f9; text-decoration: none; }
    .path a:hover { color: #38bdf8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">ONLINE - RUNNING</div>
    <h1>IELTSMaster ELearning Service</h1>
    <p>Backend REST API dịch vụ E-Learning (Luyện thi, Bài học, Chấm bài IELTS) đang hoạt động ổn định và sẵn sàng kết nối.</p>
    <div class="routes">
      <h3>Endpoints khả dụng:</h3>
      <div class="route-item"><span class="method">GET</span><span class="path"><a href="/api/health">/api/health</a> (Kiểm tra trạng thái & DB)</span></div>
      <div class="route-item"><span class="method">POST</span><span class="path">/api/auth/login (Đăng nhập E-Learning)</span></div>
      <div class="route-item"><span class="method">GET</span><span class="path"><a href="/api/exams">/api/exams</a> (Danh sách đề thi)</span></div>
      <div class="route-item"><span class="method">GET</span><span class="path"><a href="/api/lessons">/api/lessons</a> (Danh sách bài học)</span></div>
      <div class="route-item"><span class="method">GET</span><span class="path"><a href="/api/grading">/api/grading</a> (Danh sách bài chấm)</span></div>
    </div>
  </div>
</body>
</html>`;
  }
}
