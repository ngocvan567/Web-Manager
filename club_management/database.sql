-- MySQL dump & Migration Script for Club Management System

CREATE DATABASE IF NOT EXISTS `club_management` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `club_management`;

-- 1. Table `departments`
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `department_id` int NOT NULL AUTO_INCREMENT,
  `department_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `department_name` (`department_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `departments` (`department_id`, `department_name`, `description`) VALUES
(1, 'Không có ban', 'Thành viên chưa được phân vào ban nào'),
(2, 'Ban Chủ nhiệm', 'Quản lý và điều hành toàn bộ hoạt động của câu lạc bộ'),
(3, 'Ban Học thuật', 'Tổ chức các hoạt động học thuật, workshop và chia sẻ kiến thức'),
(4, 'Ban Cố vấn', 'Hỗ trợ chuyên môn, định hướng và cố vấn cho câu lạc bộ'),
(5, 'Ban Vận hành', 'Quản lý hậu cần, tổ chức và vận hành các sự kiện')
ON DUPLICATE KEY UPDATE `department_name` = VALUES(`department_name`);

-- 2. Table `users`
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mssv` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `username` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` varchar(20) COLLATE utf8mb4_general_ci DEFAULT 'MEMBER',
  `status` enum('ACTIVE','INACTIVE','BLOCKED') COLLATE utf8mb4_general_ci DEFAULT 'ACTIVE',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mssv` (`mssv`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Admin account initial seed
INSERT INTO `users` (`id`, `mssv`, `username`, `password`, `full_name`, `email`, `role`, `status`) VALUES
(1, 'ADMIN001', 'admin', '123456', 'Quản Trị Viên Hệ Thống', 'admin@club.edu.vn', 'ADMIN', 'ACTIVE'),
(2, 'DE190083', 'DE190083', '123456', 'Hoàng Văn Khánh', 'Khanhhv0000@gmail.com', 'ADMIN', 'ACTIVE'),
(3, 'HE199201', 'HE199201', '123456', 'Nguyễn Trường Thịnh', 'truongthinh09122005@gmail.com', 'MEMBER', 'ACTIVE'),
(4, 'DE190292', 'DE190292', '123456', 'Trần Vũ Đăng Khoa', 'dangkhoatran128@gmail.com', 'MEMBER', 'ACTIVE');

-- 3. Table `members`
DROP TABLE IF EXISTS `members`;
CREATE TABLE `members` (
  `user_id` int NOT NULL,
  `student_code` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `course` varchar(10) COLLATE utf8mb4_general_ci DEFAULT 'K19',
  `department_id` int DEFAULT 1,
  `position` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'Thành Viên',
  PRIMARY KEY (`user_id`),
  KEY `fk_members_departments` (`department_id`),
  CONSTRAINT `fk_members_departments` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `members_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `members` (`user_id`, `student_code`, `full_name`, `email`, `course`, `department_id`, `position`) VALUES
(1, 'ADMIN001', 'Quản Trị Viên Hệ Thống', 'admin@club.edu.vn', 'K19', 2, 'Chủ Nhiệm'),
(2, 'DE190083', 'Hoàng Văn Khánh', 'Khanhhv0000@gmail.com', 'K19', 2, 'Chủ Nhiệm'),
(3, 'HE199201', 'Nguyễn Trường Thịnh', 'truongthinh09122005@gmail.com', 'K19', 2, 'Phó Chủ Nhiệm'),
(4, 'DE190292', 'Trần Vũ Đăng Khoa', 'dangkhoatran128@gmail.com', 'K19', 3, 'Trưởng Ban Học Thuật');

-- 4. Table `events`
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `location` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `host_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  KEY `created_by` (`host_by`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`host_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `events` (`event_id`, `title`, `description`, `location`, `start_time`, `end_time`, `host_by`) VALUES
(1, 'Sinh hoạt CLB tuần 1', 'Giới thiệu thành viên mới, phổ biến nội quy CLB.', 'Phòng G214', '2026-07-12 17:30:00', '2026-07-12 20:30:00', 1),
(2, 'Workshop Web Pentesting', 'Chia sẻ kiến thức Web Pentesting và Burp Suite.', 'Phòng G214', '2026-07-19 17:30:00', '2026-07-19 20:30:00', 1);

-- 5. Table `event_attendance`
DROP TABLE IF EXISTS `event_attendance`;
CREATE TABLE `event_attendance` (
  `attendance_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `attendance_status` enum('Registered','Present','Absent') COLLATE utf8mb4_general_ci DEFAULT 'Registered',
  `check_in_time` datetime DEFAULT NULL,
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `event_user` (`event_id`,`user_id`),
  KEY `fk_attendance_member` (`user_id`),
  CONSTRAINT `fk_attendance_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_member` FOREIGN KEY (`user_id`) REFERENCES `members` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Table `announcements`
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `announcement_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `content` text COLLATE utf8mb4_general_ci NOT NULL,
  `created_by` int DEFAULT NULL,
  `publish_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` enum('Đã đăng','Bản nháp','Đã ẩn') COLLATE utf8mb4_general_ci DEFAULT 'Đã đăng',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`announcement_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `announcements` (`announcement_id`, `title`, `content`, `created_by`, `status`) VALUES
(1, 'Chào mừng Tân thành viên K19', 'Chào mừng các bạn sinh viên đã đăng ký tham gia CLB. Lịch sinh hoạt tuần đầu tiên đã cập nhật!', 1, 'Đã đăng');
