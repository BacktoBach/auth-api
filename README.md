# Auth API — JWT, bcrypt và RBAC

REST API xác thực người dùng với Node.js, Express và MongoDB.

## Chạy local

1. Chạy `npm install`.
2. Sao chép `.env.example` thành `.env` và điền các biến môi trường.
3. Chạy `npm run dev`.

`JWT_SECRET` phải là chuỗi ngẫu nhiên có ít nhất 32 ký tự. `CLIENT_ORIGIN` là danh sách origin frontend được phép, phân tách bằng dấu phẩy; có thể bỏ trống khi chưa có frontend.

Có thể tạo JWT secret an toàn bằng lệnh:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Khi server khởi động thành công, terminal sẽ hiển thị hai link có thể bấm:

```text
Server is running at http://localhost:3000
Health check: http://localhost:3000/health
```

## Endpoints

| Method | Endpoint                      | Quyền     | Mô tả                                  |
| ------ | ----------------------------- | ---------- | ---------------------------------------- |
| POST   | `/api/auth/register`        | Public     | Đăng ký tài khoản user              |
| POST   | `/api/auth/login`           | Public     | Đăng nhập và nhận JWT               |
| GET    | `/api/auth/me`              | User/Admin | Thông tin người dùng hiện tại      |
| PUT    | `/api/auth/change-password` | User/Admin | Đổi mật khẩu                         |
| POST   | `/api/auth/logout`          | User/Admin | Hướng dẫn client xóa JWT             |
| GET    | `/api/auth/users`           | Admin      | Danh sách người dùng, kiểm tra RBAC |
| GET    | `/health`                   | Public     | Railway health check                     |

`GET /health` trả `200` khi MongoDB đã kết nối và `503` khi database mất kết nối.

Protected route cần header `Authorization: Bearer <token>`.

## Tạo tài khoản admin

Register luôn tạo role `user` để tránh leo quyền. Đổi role cho quản trị viên đầu tiên trong MongoDB Atlas/Compass:

```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

## Deploy Railway

1. Đẩy source lên GitHub và tạo Railway project từ repository.
2. Thêm `MONGO_URI` và `JWT_SECRET` trong Railway Variables. Không commit `.env`.
3. Railway dùng `node server.js` và kiểm tra `/health` theo `railway.json`.
4. Generate Domain trong Networking, rồi mở `https://<domain>/health`.

Server lắng nghe biến `PORT` do Railway cấp trên host `0.0.0.0`. Cấu hình deploy dùng Railpack và dành 10 giây để ứng dụng đóng HTTP server cùng kết nối MongoDB khi nhận `SIGTERM`.

JWT là stateless nên server không thể xóa token trong LocalStorage/Memory. Client phải xóa token sau khi logout. Token hết hạn sau 1 ngày; sau khi đổi mật khẩu, token cũ bị từ chối ngay.

## Test bằng Postman

Đặt biến collection `baseUrl` là `http://localhost:3000`, sau đó gọi lần lượt:

1. `POST {{baseUrl}}/api/auth/register`

```json
{
  "name": "Nguyen Van A",
  "email": "user@example.com",
  "password": "Password123"
}
```

2. `POST {{baseUrl}}/api/auth/login` với email và password vừa đăng ký. Sao chép `token` trong response.
3. Ở tab Authorization của các protected request, chọn **Bearer Token** và dán token.
4. Gọi `GET {{baseUrl}}/api/auth/me`.
5. Gọi `PUT {{baseUrl}}/api/auth/change-password`:

```json
{
  "oldPassword": "Password123",
  "newPassword": "NewPassword123"
}
```

6. Đăng nhập lại bằng mật khẩu mới để lấy token mới.
7. Gọi `POST {{baseUrl}}/api/auth/logout`, sau đó xóa token trong Postman/client.

Để kiểm tra RBAC, đổi role của tài khoản thành `admin` trong MongoDB, đăng nhập lại để lấy token, rồi gọi `GET {{baseUrl}}/api/auth/users`. Token của user thường sẽ nhận lỗi `403 Forbidden`...
