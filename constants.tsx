
import React from 'react';
import { SidebarBlock, ExerciseType } from './types';

export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  primaryLight: '#DBEAFE',
  bgLight: '#F0F9FF',
  textMain: '#1F2937',
  textSecondary: '#4B5563',
  border: '#DBEAFE',
  warning: '#F97316',
  success: '#10B981',
  danger: '#EF4444',
};

export const DEFAULT_SIDEBAR_BLOCKS: SidebarBlock[] = [
  {
    id: 'sb_1',
    title: 'Hướng dẫn nằm nghiêng "ĐÚNG + CHUẨN"',
    content: 'Nếu cậu có thói quen nằm nghiêng, hãy dành chút thời gian xem video này. Nó sẽ giúp cậu nhìn việc nằm nghiêng theo một góc hoàn toàn khác, đặc biệt hữu ích nếu cậu chỉ ngủ được khi nằm nghiêng.',
    video_link: 'https://www.youtube.com/shorts/Xd-A6VsCees',
    type: 'default',
  },
  {
    id: 'sb_2',
    title: 'Massage Cơ Cắn',
    content: 'Mỗi ngày, massage 2–4 phút cho mỗi bên.\nTần xuất: 1 lần/ngày',
    video_link: 'https://www.youtube.com/shorts/_gUXlYuvOxA',
    type: 'dark',
  },
  {
    id: 'sb_5',
    title: 'Dụng cụ luyện tập (nên có)',
    content: 'Trước khi tập, các cậu chuẩn bị bộ dụng cụ hỗ trợ nâng cơ – gọn mặt – tăng hiệu quả bài tập nhé.\n👉 Combo gồm 5 dụng cụ (giá 260K) và Enterosgel (giá 450K)\nGồm:\n• Bóng trơn: tăng lưu thông máu\n• Bóng gai: tác động sâu hơn\n• Găng tay y tế: massage nội miệng\n• 2 cốc hút: size M & L\n• Dây kháng lực: tập cổ – vai – gáy\n• Enterosgel: thải độc ruột (rất quan trọng)',
    video_link: 'https://30ngay-thaydoi.netlify.app/',
    type: 'default',
  },
  {
    id: 'sb_3',
    title: 'Bữa ăn chất lượng:',
    content: '- Protein giúp sửa chữa các vi tổn thương sau mỗi buổi tập, làm cơ dày và khỏe hơn.\n- Không ăn kiêng, hãy ăn đầy đủ, ưu tiên đạm chất lượng cao từ thịt giàu protein để cơ thể có nền tảng phục hồi và nền cơ săn chắc.\n- Tham khảo bữa ăn chất lượng tại đây.',
    video_link: 'https://drive.google.com/file/d/1_8uKdhWj2L2mvDcsQ5-epsyWDV5Lb-cz/view',
    type: 'default',
  },
  {
    id: 'sb_4',
    title: 'Lời Khuyên:',
    content: '- Ăn nhai đều\n- Không vắt chéo, hay ngồi gác chân\n- Hạn chế tối đa tư thế nằm nghiêng khi ngủ\n- Không chống cằm\n- Ngồi thẳng, hạn chế tối đa cúi + ngồi gù (Nếu dùng điện thoại, hãy đưa điện thoại ngang tầm mắt)',
    type: 'dark',
  }
];

export const MASTER_DATES = ["01/01/2025", "15/02/2025", "20/03/2025"];

export const EXERCISE_TYPES = [ExerciseType.MANDATORY, ExerciseType.OPTIONAL];