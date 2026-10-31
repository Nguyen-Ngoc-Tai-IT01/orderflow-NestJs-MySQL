# Phân công công việc dự án

## 1. Backend

### Tài – Core Architecture & Security

- Khởi tạo repository Git, dựng base project NestJS, cấu hình TypeORM + MySQL, ValidationPipe toàn cục.
- Phụ trách Entity **User** (`user.entity.ts`): lưu trữ thông tin nhân viên, băm mật khẩu (Bcrypt), định nghĩa Role (Admin, Chef, Waiter).
- Module Auth & Users: API đăng nhập, xác thực JWT + Passport.
- Xây dựng `JwtAuthGuard` và `RolesGuard` để phân quyền.
- Tổng hợp và review toàn bộ Entity từ các thành viên khác để đảm bảo cấu trúc database chuẩn.
- Viết logic Auth bảo vệ tất cả các Entity còn lại.

### Vỹ – Core Logic (Orders & Inventory)

- Phụ trách Entity: **Order**, **OrderItem**, **Inventory**.
- Module Orders (trái tim hệ thống): API tạo đơn, lấy danh sách (phân trang, search, filter theo trạng thái).
- State Machine: cập nhật trạng thái đơn (Pending → Preparing → Ready → Served) với ràng buộc không cho nhảy cóc.
- Module Inventory & Transaction: API quản lý kho nguyên liệu.
- Viết Database Transaction khi tạo Order (insert OrderItems + trừ Inventory cùng lúc, rollback nếu lỗi hoặc hết hàng).
- Thiết lập quan hệ One-to-Many giữa Order và OrderItem.

### Sêu – Master Data (Menu, Tables & Reports)

- Phụ trách Entity: MenuItem, Table.
- Module Menu: CRUD thực đơn (tên, giá, phân loại, trạng thái, upload hình ảnh).
- Module Tables & Customers: quản lý bàn (trống/đang phục vụ) và thông tin khách đặt trước.
- Module Reports: dùng QueryBuilder viết API thống kê doanh thu theo ngày/tuần, số đơn hủy, top món bán chạy (Join Order – OrderItem – MenuItem).

---

## 2. Frontend

### Tuyến – Main Dashboard UI & API Integration

- Dựng Base Layout: Sidebar, Header, thanh Search.
- Order Dashboard (giao diện chính): cắt HTML/CSS/React (hoặc Next.js) danh sách đơn dạng Grid + Order Cards theo thiết kế.
- Tích hợp API từ Vỹ: render danh sách đơn, chuyển Tab (All, Ready, Pending…), xử lý nút hành động (Cancel, Start Preparing, Mark Ready) và hiển thị chi tiết OrderItem trên từng thẻ.

### Hiệp – Sub-pages, Charts & UX/UI Polish

- Giao diện Master Data: màn hình quản lý Menu, Tables, Inventory, Staff list (CRUD dạng bảng).
- Giao diện Báo cáo: tích hợp Recharts/Chart.js vẽ biểu đồ doanh thu từ API của Sêu.
- Tối ưu UX/UI: Toast notification, Widget “Support”, kiểm tra Responsive trên PC.
- Tích hợp API từ Tài và Sêu cho các trang quản lý nhân viên, thực đơn, bàn, kho.

---

## Cách phối hợp

- Vỹ và Sêu tự định nghĩa Entity của mình trước.
- Tài sẽ review và ghép nối toàn bộ Entity + Module.
- Frontend chỉ gọi API, không đụng vào Entity/Database.
