# JWT Authentication API

REST API xác thực và phân quyền người dùng, xây dựng bằng Node.js, Express và MongoDB. JWT được cấp qua cookie `httpOnly`; backend chịu trách nhiệm verify token, thu hồi token cũ và kiểm soát truy cập theo vai trò (RBAC).

## Tính năng

- Đăng ký tài khoản và hash mật khẩu bằng bcrypt.
- Đăng nhập bằng email/password và cấp JWT trong cookie `httpOnly` có thời hạn 1 ngày.
- Cookie production dùng `Secure`, `SameSite=Lax`, `Path=/` và prefix `__Host-`.
- Middleware xác thực JWT trực tiếp từ cookie.
- Phân quyền `user` và `admin`.
- Đổi mật khẩu sau khi xác minh mật khẩu hiện tại.
- Vô hiệu hóa token cũ bằng `tokenVersion` sau khi đổi mật khẩu.
- Rate limiting riêng cho đăng ký và đăng nhập.
- Kiểm tra Origin cho request thay đổi dữ liệu để giảm rủi ro CSRF.
- Tìm kiếm user phía server đồng bộ với pagination.
- Validation error hỗ trợ danh sách lỗi theo field.
- Error response thống nhất theo cấu trúc `{ message, error, statusCode }`.
- Health check phản ánh trạng thái kết nối MongoDB.
- Validate biến môi trường ngay khi khởi động.
- Graceful shutdown cho HTTP server và MongoDB.
- Cấu hình triển khai Render bằng Blueprint.

## Demo đã deploy

- **Base URL:** [https://auth-api-jne3.onrender.com](https://auth-api-jne3.onrender.com)
- **Health check:** [https://auth-api-jne3.onrender.com/health](https://auth-api-jne3.onrender.com/health)
- **API information:** [https://auth-api-jne3.onrender.com/](https://auth-api-jne3.onrender.com/)

## Công nghệ

- Node.js 20+
- ES Modules (`import` / `export`)
- Express 5
- MongoDB và Mongoose
- JSON Web Token
- bcryptjs
- Node.js Test Runner

## Cấu trúc project

```text
auth-api/
├── src/
│   ├── config/          # Cấu hình database và environment
│   ├── controllers/     # Nhận request và trả HTTP response
│   ├── services/        # Nghiệp vụ auth và truy vấn user
│   ├── middlewares/     # JWT, RBAC, rate limit và error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Khai báo API routes
│   ├── utils/           # JWT, serializer, password và HTTP server
│   └── app.js           # Cấu hình Express application
├── test/                # Automated tests
├── server.js            # Khởi động và graceful shutdown server
├── render.yaml          # Render Blueprint
└── .env.example         # Mẫu biến môi trường
```

## Cài đặt và chạy local

Yêu cầu Node.js phiên bản 20 trở lên và một MongoDB connection string.

```bash
npm install
```

Tạo file `.env` dựa trên `.env.example`:

```env
PORT=3000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=<random-secret-with-at-least-32-characters>
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173
```

`CLIENT_ORIGIN` hỗ trợ nhiều origin, phân tách bằng dấu phẩy. Biến này bắt buộc trong production và mỗi origin production phải dùng HTTPS. Request từ browser chỉ được chấp nhận khi origin nằm trong allowlist; request không có header `Origin` như Postman/cURL vẫn được hỗ trợ.

Tạo JWT secret ngẫu nhiên:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Chạy development server:

```bash
npm run dev
```

Server mặc định chạy tại `http://localhost:3000`. Kiểm tra trạng thái tại `GET /health`.

## API endpoints

| Method | Endpoint | Access | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Đăng ký tài khoản với role `user` |
| POST | `/api/auth/login` | Public | Đăng nhập và nhận JWT qua httpOnly cookie |
| GET | `/api/auth/me` | User/Admin | Lấy thông tin người dùng hiện tại |
| PUT | `/api/auth/change-password` | User/Admin | Xác minh và đổi mật khẩu |
| POST | `/api/auth/logout` | Public | Xóa auth cookie, kể cả cookie hết hạn hoặc không hợp lệ |
| GET | `/api/auth/users?page=1&limit=20&search=...` | Admin | Lấy và tìm kiếm người dùng có phân trang |
| GET | `/health` | Public | Kiểm tra API và MongoDB |

Rate limit theo địa chỉ IP:

- Register: tối đa 5 request mỗi giờ.
- Login: tối đa 10 request không thành công trong 15 phút; login thành công không bị tính vào giới hạn.
- Khi vượt giới hạn, API trả `429 Too Many Requests` theo error response chuẩn.

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Nguyen Van A",
  "email": "user@example.com",
  "password": "Password123"
}
```

Tất cả tài khoản đăng ký qua API đều nhận role `user`; field `role` từ request không được sử dụng nhằm ngăn hành vi tự cấp quyền admin.

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "Password123",
  "remember": true
}
```

`remember=true` tạo persistent cookie tối đa 1 ngày. `remember=false` hoặc không truyền field này tạo session cookie, nhưng JWT bên trong vẫn hết hạn sau 1 ngày.

Response thành công:

```json
{
  "message": "Đăng nhập thành công",
  "user": {
    "id": "662c8b7f3e9b2d4b7f1a2c3d",
    "name": "Nguyen Van A",
    "email": "user@example.com",
    "role": "user"
  },
  "session": {
    "expiresAt": "2026-09-14T10:00:00.000Z"
  },
  "expiresIn": "1d",
  "statusCode": 200
}
```

Response login có header `Set-Cookie`; raw JWT không được trả trong JSON và không cần được JavaScript lưu vào LocalStorage/SessionStorage.

### Protected routes

Các protected route yêu cầu auth cookie được cấp bởi endpoint login. Browser cần gửi request với `credentials: "include"`; Postman tự lưu và gửi cookie thông qua cookie jar.

Body của endpoint đổi mật khẩu:

```json
{
  "oldPassword": "Password123",
  "newPassword": "NewPassword123"
}
```

Sau khi đổi mật khẩu, token cũ không còn hợp lệ và người dùng phải đăng nhập lại.

Access token chỉ chứa hai thông tin cần thiết: `sub` (user ID) và `tokenVersion`. Name, email và role không được đưa vào JWT; role luôn được đọc lại từ database khi xác thực. Token hết hạn sau 1 ngày và frontend nhận `session.expiresAt` để hiển thị thời hạn mà không cần đọc cookie.

### Error response

```json
{
  "message": "Email hoặc mật khẩu không đúng",
  "error": "Unauthorized",
  "statusCode": 401
}
```

Validation error có thể bổ sung field `errors`:

```json
{
  "message": "Dữ liệu không hợp lệ",
  "error": "Bad Request",
  "statusCode": 400,
  "errors": [
    { "field": "email", "message": "Email không hợp lệ" }
  ]
}
```

## RBAC và tài khoản admin

API không cho phép client tự chọn role khi đăng ký. Tài khoản quản trị đầu tiên cần được cấp role trực tiếp trong MongoDB Atlas/Compass:

```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

Sau khi thay đổi role, đăng nhập lại để nhận auth cookie mới rồi gọi `GET /api/auth/users`. Session của user thông thường nhận response `403 Forbidden`.

Endpoint danh sách người dùng hỗ trợ `page`, `limit` và `search`. Giá trị mặc định lần lượt là `1` và `20`; `limit` tối đa `100`, `search` tối đa 100 ký tự. Search tìm theo `name` hoặc `email`; `total` và `totalPages` phản ánh đúng tập kết quả đã lọc.

## Kiểm thử

Chạy automated tests:

```bash
npm test
```

Kiểm tra cú pháp các file chính:

```bash
npm run check
```

API cũng có thể được kiểm thử bằng Postman với biến collection:

```text
baseUrl = http://localhost:3000
```

Khi test bản đã deploy trên Render, thay bằng:

```text
baseUrl = https://auth-api-jne3.onrender.com
```

Luồng kiểm thử đề xuất: register → login → me → change password → login lại → logout. Sau login, kiểm tra cookie trong Postman cookie jar; không cấu hình Bearer Token. Cookie cũ bị xóa sau đổi mật khẩu và logout.

## Deploy Render

Project sử dụng `render.yaml` để khai báo Node web service, start command `node server.js` và health check `/health`.

Có thể chọn **New → Blueprint** trong Render Dashboard và kết nối repository. Các biến cần khai báo:

```text
MONGO_URI
JWT_SECRET
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN
```

Render tự cung cấp biến `PORT`. Blueprint tự tạo `JWT_SECRET`; `MONGO_URI` và `CLIENT_ORIGIN` cần được nhập trong quá trình tạo service. Server lắng nghe trên `0.0.0.0` và tự đóng HTTP server cùng kết nối MongoDB khi nhận `SIGTERM`.

## Lưu ý về logout

JWT trong project vẫn là stateless và không được lưu tại server. Endpoint logout xóa auth cookie của trình duyệt hiện tại, kể cả khi cookie không hợp lệ. Logout không tăng `tokenVersion`; đổi mật khẩu mới tăng version để vô hiệu hóa mọi JWT cũ của tài khoản.

## Security notes

- Password không bao giờ được lưu dưới dạng plain text hoặc trả về trong response.
- Raw JWT không được trả trong login JSON hoặc lưu trong Web Storage.
- Cookie auth là `httpOnly`; JavaScript frontend không đọc được token.
- Request thay đổi dữ liệu từ browser phải có Origin hợp lệ.
- Password dài quá 72 byte UTF-8 bị từ chối để tránh cơ chế truncate của bcrypt.
- `.env` không được commit; chỉ `.env.example` được lưu trong repository.
- JWT secret nên khác nhau giữa local, staging và production.
- MongoDB credentials và JWT secret phải được lưu bằng secret/environment variables của nền tảng deploy.
