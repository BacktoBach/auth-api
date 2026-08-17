# JWT Authentication API

REST API xác thực và phân quyền người dùng, xây dựng bằng Node.js, Express và MongoDB. Project minh họa quy trình đăng ký, đăng nhập, bảo vệ route bằng JWT, đổi mật khẩu và kiểm soát truy cập theo vai trò (RBAC).

## Tính năng

- Đăng ký tài khoản và hash mật khẩu bằng bcrypt.
- Đăng nhập bằng email/password và cấp JWT có thời hạn 1 ngày.
- Middleware xác thực `Authorization: Bearer <token>`.
- Phân quyền `user` và `admin`.
- Đổi mật khẩu sau khi xác minh mật khẩu hiện tại.
- Vô hiệu hóa token cũ bằng `tokenVersion` sau khi đổi mật khẩu.
- Rate limiting riêng cho đăng ký và đăng nhập.
- Error response thống nhất theo cấu trúc `{ message, error, statusCode }`.
- Health check phản ánh trạng thái kết nối MongoDB.
- Validate biến môi trường ngay khi khởi động.
- Graceful shutdown cho HTTP server và MongoDB.
- Cấu hình triển khai Render bằng Blueprint.

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

`CLIENT_ORIGIN` hỗ trợ nhiều origin, phân tách bằng dấu phẩy. Nếu không khai báo, API cho phép request từ mọi origin.

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
| POST | `/api/auth/login` | Public | Đăng nhập và nhận JWT |
| GET | `/api/auth/me` | User/Admin | Lấy thông tin người dùng hiện tại |
| PUT | `/api/auth/change-password` | User/Admin | Xác minh và đổi mật khẩu |
| POST | `/api/auth/logout` | User/Admin | Xác nhận đăng xuất phía client |
| GET | `/api/auth/users?page=1&limit=20` | Admin | Lấy danh sách người dùng có phân trang |
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
  "password": "Password123"
}
```

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
  "token": "<jwt-token>",
  "expiresIn": "1d"
}
```

### Protected routes

Các protected route yêu cầu header:

```http
Authorization: Bearer <jwt-token>
```

Body của endpoint đổi mật khẩu:

```json
{
  "oldPassword": "Password123",
  "newPassword": "NewPassword123"
}
```

Sau khi đổi mật khẩu, token cũ không còn hợp lệ và người dùng phải đăng nhập lại.

Access token chỉ chứa hai thông tin cần thiết: `sub` (user ID) và `tokenVersion`. Name, email và role không được đưa vào JWT; role luôn được đọc lại từ database khi xác thực. Token hết hạn sau 1 ngày.

### Error response

```json
{
  "message": "Email hoặc mật khẩu không đúng",
  "error": "Unauthorized",
  "statusCode": 401
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

Sau khi thay đổi role, đăng nhập lại để nhận token mới rồi gọi `GET /api/auth/users`. Token của user thông thường nhận response `403 Forbidden`.

Endpoint danh sách người dùng hỗ trợ `page` và `limit`. Giá trị mặc định lần lượt là `1` và `20`; `limit` tối đa là `100`.

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

Luồng kiểm thử đề xuất: register → login → me → change password → login lại → logout. Với protected route, chọn Authorization type `Bearer Token` và sử dụng token trả về từ login.

## Deploy Render

Project sử dụng `render.yaml` để khai báo Node web service, start command `node server.js` và health check `/health`.

Có thể chọn **New → Blueprint** trong Render Dashboard và kết nối repository. Các biến cần khai báo:

```text
MONGO_URI
JWT_SECRET
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN
```

Render tự cung cấp biến `PORT`. Blueprint tự tạo `JWT_SECRET`; `MONGO_URI` và `CLIENT_ORIGIN` cần được nhập trong quá trình tạo service. Server lắng nghe trên `0.0.0.0` và có tối đa 15 giây để đóng kết nối an toàn sau khi nhận `SIGTERM`.

## Lưu ý về logout

JWT trong project là stateless và không được lưu tại server. Endpoint logout xác nhận thao tác, còn client chịu trách nhiệm xóa token khỏi LocalStorage, cookie hoặc memory. Token cũng tự hết hạn sau 1 ngày.

## Security notes

- Password không bao giờ được lưu dưới dạng plain text hoặc trả về trong response.
- Password dài quá 72 byte UTF-8 bị từ chối để tránh cơ chế truncate của bcrypt.
- `.env` không được commit; chỉ `.env.example` được lưu trong repository.
- JWT secret nên khác nhau giữa local, staging và production.
- MongoDB credentials và JWT secret phải được lưu bằng secret/environment variables của nền tảng deploy.
