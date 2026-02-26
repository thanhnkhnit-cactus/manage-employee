# 🏢 Quản Lý Nhân Viên

Phần mềm quản lý nhân viên dành cho nhân viên kế toán, xây dựng với React + Vite + Supabase.

## ✨ Tính năng

- 🔐 **Đăng nhập / Đăng xuất** - Xác thực qua Supabase Auth
- 👥 **Quản lý nhân viên** - Thêm, sửa, xóa, tìm kiếm nhân viên
- 📊 **Thống kê** - Tổng nhân viên, đang làm việc, đã nghỉ
- 📥 **Import Excel** - Import danh sách nhân viên hàng loạt
- 🔍 **Tìm kiếm & Lọc** - Tìm theo tên/mã NV, lọc theo trạng thái
- 📱 **Responsive** - Hoạt động trên cả điện thoại và máy tính

## 🛠️ Công nghệ

- **Frontend:** React 18, Vite 7
- **Styling:** Tailwind CSS v4
- **Database & Auth:** Supabase
- **Excel:** SheetJS (xlsx)
- **Icons:** Lucide React
- **Routing:** React Router DOM

## 🚀 Cài đặt & Chạy

### 1. Clone repository

```bash
git clone https://github.com/your-username/quan-ly-nhan-vien.git
cd quan-ly-nhan-vien
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

```bash
cp .env.example .env
```

Mở file `.env` và điền thông tin Supabase của bạn:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Tạo bảng database trong Supabase

Chạy SQL sau trong Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.nhan_vien (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ma_nhan_vien TEXT NOT NULL UNIQUE,
  ho_ten TEXT NOT NULL,
  don_vi TEXT,
  ma_so_thue TEXT,
  so_cccd TEXT,
  da_nghi_viec BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.nhan_vien ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view employees" ON public.nhan_vien
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert employees" ON public.nhan_vien
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update employees" ON public.nhan_vien
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete employees" ON public.nhan_vien
  FOR DELETE TO authenticated USING (true);
```

### 5. Chạy ứng dụng

```bash
npm run dev
```

Truy cập: [http://localhost:5173](http://localhost:5173)

## 📊 Định dạng File Excel Import

| Cột | Mô tả |
|-----|-------|
| `MaNV` | Mã nhân viên (bắt buộc) |
| `HoTen` | Họ và tên (bắt buộc) |
| `DonVi` | Đơn vị / Phòng ban |
| `MaSoThue` | Mã số thuế |
| `SoCCCD` | Số căn cước công dân |

> 💡 Sử dụng nút **"Tải file mẫu"** trong ứng dụng để tải template Excel.

## 📁 Cấu trúc dự án

```
src/
├── components/
│   └── Layout.jsx          # Layout chung (header, footer)
├── contexts/
│   └── AuthContext.jsx     # Context xác thực người dùng
├── lib/
│   └── supabase.js         # Khởi tạo Supabase client
├── pages/
│   ├── LoginPage.jsx       # Trang đăng nhập
│   └── NhanVienPage.jsx    # Trang quản lý nhân viên
├── App.jsx                 # Root component + routing
├── main.jsx                # Entry point
└── index.css               # Global styles
```

## 📝 License

MIT
