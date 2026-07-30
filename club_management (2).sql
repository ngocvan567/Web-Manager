-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th7 27, 2026 lúc 01:35 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `club_management`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `announcements`
--

CREATE TABLE `announcements` (
  `announcement_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `publish_date` datetime DEFAULT current_timestamp(),
  `status` enum('Đã đăng','Bản nháp','Đã ẩn') DEFAULT 'Đã đăng',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `departments`
--

CREATE TABLE `departments` (
  `department_id` int(11) NOT NULL,
  `department_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `departments`
--

INSERT INTO `departments` (`department_id`, `department_name`, `description`, `created_at`) VALUES
(1, 'Không có ban', 'Thành viên chưa được phân vào ban nào', '2026-07-06 17:48:03'),
(2, 'Ban Chủ nhiệm', 'Quản lý và điều hành toàn bộ hoạt động của câu lạc bộ', '2026-07-06 17:48:03'),
(3, 'Ban Học thuật', 'Tổ chức các hoạt động học thuật, workshop và chia sẻ kiến thức', '2026-07-06 17:48:03'),
(4, 'Ban Cố vấn', 'Hỗ trợ chuyên môn, định hướng và cố vấn cho câu lạc bộ', '2026-07-06 17:48:03'),
(5, 'Ban Vận hành', 'Quản lý hậu cần, tổ chức và vận hành các sự kiện', '2026-07-06 17:48:03');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `events`
--

CREATE TABLE `events` (
  `event_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(200) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `host_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `events`
--

INSERT INTO `events` (`event_id`, `title`, `description`, `location`, `start_time`, `end_time`, `host_by`, `created_at`, `updated_at`) VALUES
(1, 'Sinh hoạt CLB tuần 1', 'Giới thiệu thành viên mới, phổ biến nội quy CLB.', 'Phòng G214', '2026-07-12 17:30:00', '2026-07-12 20:30:00', 1, '2026-07-06 19:39:07', '2026-07-06 19:39:52'),
(2, 'Sinh hoạt CLB tuần 2', 'Chia sẻ kiến thức Web Pentesting.', 'Phòng G214', '2026-07-19 17:30:00', '2026-07-19 20:30:00', 1, '2026-07-06 19:39:07', '2026-07-06 19:39:55'),
(3, 'Sinh hoạt CLB tuần 3', 'Thực hành Burp Suite.', 'Phòng G214', '2026-07-26 17:30:00', '2026-07-26 20:30:00', 1, '2026-07-06 19:39:07', '2026-07-07 11:54:58'),
(4, 'Workshop SQL Injection', 'Hướng dẫn khai thác SQL Injection.', 'Phòng G214', '2026-08-02 17:30:00', '2026-08-02 21:00:00', 1, '2026-07-06 19:39:07', '2026-07-06 19:40:09'),
(5, 'Họp Ban Chủ nhiệm', 'Đánh giá hoạt động tháng.', 'Phòng G214', '2026-08-05 19:00:00', '2026-08-05 20:00:00', 1, '2026-07-06 19:39:07', '2026-07-06 19:39:38');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `event_attendance`
--

CREATE TABLE `event_attendance` (
  `attendance_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `attendance_status` enum('Registered','Present','Absent') DEFAULT 'Registered',
  `check_in_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `financials`
--

CREATE TABLE `financials` (
  `transaction_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL COMMENT 'Số tiền thu hoặc chi',
  `transaction_type` enum('Thu','Chi') NOT NULL COMMENT 'Loại giao dịch',
  `description` text NOT NULL COMMENT 'Lý do thu/chi hoặc tên khoản mục',
  `reference_event_id` int(11) DEFAULT NULL COMMENT 'Giao dịch này có thuộc sự kiện nào không',
  `created_by` int(11) DEFAULT NULL COMMENT 'Người thực hiện nhập giao dịch',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `members`
--

CREATE TABLE `members` (
  `user_id` int(11) NOT NULL,
  `student_code` varchar(20) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `course` varchar(10) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `position` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `members`
--

INSERT INTO `members` (`user_id`, `student_code`, `full_name`, `email`, `course`, `department_id`, `position`) VALUES
(1, 'DE190083', 'Hoàng Văn Khánh', 'Khanhhv0000@gmail.com', 'K19', 2, 'Chủ Nhiệm'),
(2, 'HE199201', 'Nguyễn Trường Thịnh', 'truongthinh09122005@gmail.com', 'K19', 1, 'Chủ Nhiệm'),
(3, 'DE210748', 'Nguyễn Thị Ngọc Vân', 'nguyenvan12344a1@gmail.com', 'K21', 1, 'Chủ Nhiệm'),
(4, 'DE180852', 'Nguyễn Duy Minh Anh', 'anhndmde180852@fpt.edu.vn', 'K18', 1, 'Cố Vấn'),
(5, 'DE190736', 'Dương Quốc Ân', 'anduong1200@gmail.com', 'K19', 1, 'Cố Vấn'),
(6, 'DE190909', 'Mai Hồng Phát', 'phast28904@gmail.com', 'K19', 1, 'Cố Vấn'),
(7, 'DE190292', 'Trần Vũ Đăng Khoa', 'dangkhoatran128@gmail.com', 'K19', 1, 'Học Thuật'),
(8, 'DE190373', 'Bùi Văn Tiến Thịnh', 'bvttfptedu@gmail.com', 'K19', 1, 'Học Thuật'),
(9, 'DE190383', 'Phạm Hiếu Dân', 'phamdan2789@gmail.com', 'K19', 1, 'Học Thuật'),
(10, 'DE190433', 'Hồ Hoàng Tân', 'hohoangtan2k5@gmail.com', 'K19', 1, 'Học Thuật'),
(11, 'DE190537', 'Nguyễn Mạnh Toàn', 'nguyenmanhtoan456@gmail.com', 'K19', 1, 'Học Thuật'),
(12, 'DE190602', 'Trần Phạm Hải Dương', 'duongtran1806ap@gmail.com', 'K19', 1, 'Học Thuật'),
(13, 'DE190997', 'Hoàng Gia Khánh', 'hoanggiakhanh.2310@gmail.com', 'K19', 1, 'Học Thuật'),
(14, 'DE200145', 'Đinh Ngọc Minh', 'llstylish003@gmail.com', 'K20', 1, 'Học Thuật'),
(15, 'DE201424', 'Trần Gia Bảo', 'trangiabao06012006@gmail.com', 'K20', 1, 'Học Thuật'),
(16, 'DE190278', 'Nguyễn Tiến Khải', 'yugiohvuachoibai@gmail.com', 'K19', 1, 'Thành Viên'),
(17, 'DE190348', 'Trương Tấn Nguyên', 'tn0531897@gmail.com', 'K19', 1, 'Thành Viên'),
(18, 'DE190659', 'Trương Văn Pha', 'truongvanpha.dmxtk@gmail.com', 'K19', 1, 'Thành Viên'),
(19, 'DE190803', 'Trần Đỗ Bình An', 'trandobinhan2005thd@gmail.com', 'K19', 1, 'Thành Viên'),
(20, 'DE190910', 'Nguyễn Đức Tiến', 'ductien41019705@gmail.com', 'K19', 1, 'Thành Viên'),
(21, 'DE200133', 'Nguyễn Trường Phúc', 'phucdt1234@gmail.com', 'K20', 1, 'Thành Viên'),
(22, 'DE200175', 'Vũ Văn Thái', 'vovanhoa1215@gmail.com', 'K20', 1, 'Thành Viên'),
(23, 'DE200302', 'Võ Bảo Anh', 'Vobaoanh2006@gmail.com', 'K20', 1, 'Thành Viên'),
(24, 'DE200409', 'Nguyễn Văn Bách', 'vanbach.nguyen192@gmail.com', 'K20', 1, 'Thành Viên'),
(25, 'DE200525', 'Văn Trần Hoài Dân', 'hoaidan2592006@gmail.com', 'K20', 1, 'Thành Viên'),
(26, 'DE200580', 'Huỳnh Ngọc Hiếu', 'huynhngochieu28032006@gmail.com', 'K20', 1, 'Thành Viên'),
(27, 'DE201145', 'Võ Tá Minh Quân', 'quanvota29@gmail.com', 'K20', 1, 'Thành Viên'),
(28, 'DE210302', 'Lê Hoàng Minh', 'luffykun1004qb@gmail.com', 'K21', 1, 'Thành Viên'),
(29, 'De190027', 'Đặng Thanh Tùng', 'dttung501@gmail.com', 'K19', 1, 'Vận Hành'),
(30, 'DE190097', 'Nguyễn Văn Thịnh', 'programthinh@gmail.com', 'K19', 1, 'Vận Hành'),
(31, 'DE190731', 'Trần Thị Ngọc Huyền', 'tranhuyen28092005@gmail.com', 'K19', 1, 'Vận Hành'),
(32, 'DE200286', 'Dương Thế Gia Khang', 'dtgk2006@gmail.com', 'K20', 1, 'Vận Hành'),
(33, 'DE210405', 'Phan Trung Kiên', 'farmbotpro@gmail.com', 'K21', 1, 'Vận Hành');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `roles`
--

CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`, `description`) VALUES
(1, 'admin', 'Quản trị viên'),
(2, 'executive', 'Ban điều hành'),
(3, 'member', 'Thành viên');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(100) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `role` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `email`, `role`) VALUES
(1, '6.0', '123456', 'Hoàng Văn Khánh', 'user1@example.com', 'admin'),
(2, '10.0', '123456', 'Nguyễn Trường Thịnh ', 'user2@example.com', 'member'),
(3, '31.0', '123456', 'Nguyễn Thị Ngọc Vân', 'user3@example.com', 'admin'),
(4, '2.0', '123456', 'Nguyễn Duy Minh Anh', 'user4@example.com', 'member'),
(5, '3.0', '123456', 'Dương Quốc Ân ', 'user5@example.com', 'member'),
(6, '8.0', '123456', 'Mai Hồng Phát', 'user6@example.com', 'member'),
(7, '12.0', '123456', 'Trần Vũ Đăng Khoa', 'user7@example.com', 'member'),
(8, '9.0', '123456', 'Bùi Văn Tiến Thịnh', 'user8@example.com', 'member'),
(9, '4.0', '123456', 'Phạm Hiếu Dân', 'user9@example.com', 'member'),
(10, '16.0', '123456', 'Hồ Hoàng Tân', 'user10@example.com', 'member'),
(11, '11.0', '123456', 'Nguyễn Mạnh Toàn', 'user11@example.com', 'member'),
(12, '5.0', '123456', 'Trần Phạm Hải Dương ', 'user12@example.com', 'member'),
(13, '15.0', '123456', 'Hoàng Gia Khánh', 'user13@example.com', 'member'),
(14, '27.0', '123456', 'Đinh Ngọc Minh', 'user14@example.com', 'member'),
(15, '22.0', '123456', 'Trần Gia Bảo', 'user15@example.com', 'member'),
(16, '20.0', '123456', 'Nguyễn Tiến Khải', 'user16@example.com', 'member'),
(17, '34.0', '123456', 'Trương Tấn Nguyên', 'user17@example.com', 'member'),
(18, '7.0', '123456', 'Trương Văn Pha', 'user18@example.com', 'member'),
(19, '17.0', '123456', 'Trần Đỗ Bình An', 'user19@example.com', 'member'),
(20, '33.0', '123456', 'Nguyễn Đức Tiến', 'user20@example.com', 'member'),
(21, '24.0', '123456', 'Nguyễn Trường Phúc ', 'user21@example.com', 'member'),
(22, '38.0', '123456', 'Vũ Văn Thái', 'user22@example.com', 'member'),
(23, '37.0', '123456', 'Võ Bảo Anh', 'user23@example.com', 'member'),
(24, '28.0', '123456', 'Nguyễn Văn Bách', 'user24@example.com', 'member'),
(25, '36.0', '123456', 'Văn Trần Hoài Dân ', 'user25@example.com', 'member'),
(26, '35.0', '123456', 'Huỳnh Ngọc Hiếu ', 'user26@example.com', 'member'),
(27, '25.0', '123456', 'Võ Tá Minh Quân', 'user27@example.com', 'member'),
(28, '30.0', '123456', 'Lê Hoàng Minh', 'user28@example.com', 'member'),
(29, '19.0', '123456', 'Đặng Thanh Tùng', 'user29@example.com', 'member'),
(30, '13.0', '123456', 'Nguyễn Văn Thịnh', 'user30@example.com', 'member'),
(31, '21.0', '123456', 'Trần Thị Ngọc Huyền ', 'user31@example.com', 'member'),
(32, '23.0', '123456', 'Dương Thế Gia Khang ', 'user32@example.com', 'member'),
(33, '32.0', '123456', 'Phan Trung Kiên', 'user33@example.com', 'member');

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`announcement_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Chỉ mục cho bảng `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`department_id`),
  ADD UNIQUE KEY `department_name` (`department_name`);

--
-- Chỉ mục cho bảng `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `created_by` (`host_by`);

--
-- Chỉ mục cho bảng `event_attendance`
--
ALTER TABLE `event_attendance`
  ADD PRIMARY KEY (`attendance_id`),
  ADD UNIQUE KEY `event_id` (`event_id`,`user_id`),
  ADD KEY `fk_attendance_member` (`user_id`);

--
-- Chỉ mục cho bảng `financials`
--
ALTER TABLE `financials`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `fk_financials_users` (`created_by`),
  ADD KEY `fk_financials_events` (`reference_event_id`);

--
-- Chỉ mục cho bảng `members`
--
ALTER TABLE `members`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `fk_members_departments` (`department_id`);

--
-- Chỉ mục cho bảng `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `role_name` (`role_name`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `role` (`role`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `announcements`
--
ALTER TABLE `announcements`
  MODIFY `announcement_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `departments`
--
ALTER TABLE `departments`
  MODIFY `department_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `events`
--
ALTER TABLE `events`
  MODIFY `event_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `event_attendance`
--
ALTER TABLE `event_attendance`
  MODIFY `attendance_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `financials`
--
ALTER TABLE `financials`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Các ràng buộc cho bảng `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`host_by`) REFERENCES `users` (`id`);

--
-- Các ràng buộc cho bảng `event_attendance`
--
ALTER TABLE `event_attendance`
  ADD CONSTRAINT `fk_attendance_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_attendance_member` FOREIGN KEY (`user_id`) REFERENCES `members` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `financials`
--
ALTER TABLE `financials`
  ADD CONSTRAINT `fk_financials_events` FOREIGN KEY (`reference_event_id`) REFERENCES `events` (`event_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_financials_users` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `members`
--
ALTER TABLE `members`
  ADD CONSTRAINT `fk_members_departments` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE CASCADE ON UPDATE SET NULL,
  ADD CONSTRAINT `members_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Các ràng buộc cho bảng `roles`
--
ALTER TABLE `roles`
  ADD CONSTRAINT `roles_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
