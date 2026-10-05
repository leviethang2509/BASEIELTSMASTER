// Chuỗi giao diện tiếng Việt, gom một chỗ để dễ i18n về sau.
export const vi = {
  app: {
    name: 'Lang Simulator',
    tagline: 'Nền tảng quản lý trung tâm ngoại ngữ',
  },
  common: {
    loading: 'Đang tải…',
    confirm: 'Xác nhận',
    cancel: 'Hủy',
    close: 'Đóng',
    processing: 'Đang xử lý…',
    noData: 'Chưa có dữ liệu',
    backHome: 'Về trang chủ',
    loadFailed: 'Không tải được dữ liệu',
    retry: 'Thử lại',
    notFoundTitle: 'Không tìm thấy trang',
    notFoundText: 'Đường dẫn không tồn tại hoặc trang đã bị gỡ.',
    errorTitle: 'Đã có lỗi xảy ra',
    errorText:
      'Trang gặp lỗi không mong đợi. Bạn thử tải lại, nếu vẫn lỗi hãy quay lại sau.',
    optional: '(không bắt buộc)',
  },
  auth: {
    login: 'Đăng nhập',
    register: 'Đăng ký',
    logout: 'Đăng xuất',
    loginTitle: 'Chào mừng bạn trở lại',
    loginSubtitle:
      'Đăng nhập để vào không gian học tập và quản lý trung tâm của bạn.',
    registerTitle: 'Tạo tài khoản',
    registerSubtitle:
      'Miễn phí. Sau khi có tài khoản, bạn có thể tham gia hoặc đăng ký trung tâm.',
    email: 'Email',
    password: 'Mật khẩu',
    fullName: 'Họ và tên',
    dateOfBirth: 'Ngày sinh',
    emailPlaceholder: 'ban@email.com',
    passwordPlaceholder: 'Tối thiểu 8 ký tự',
    fullNamePlaceholder: 'Nguyễn Minh Anh',
    showPassword: 'Hiện mật khẩu',
    hidePassword: 'Ẩn mật khẩu',
    loggingIn: 'Đang đăng nhập…',
    registering: 'Đang tạo tài khoản…',
    submitRegister: 'Tạo tài khoản',
    loginFailed: 'Đăng nhập thất bại',
    registerFailed: 'Đăng ký thất bại',
    invalidDateOfBirth: 'Ngày sinh không hợp lệ hoặc ở tương lai',
    passwordStrength: [
      'Hãy nhập mật khẩu',
      'Yếu — thêm chữ in hoa và số',
      'Khá — thêm ký tự đặc biệt',
      'Mạnh',
    ],
  },
  account: {
    title: 'Tài khoản của tôi',
    profile: 'Hồ sơ',
    phone: 'Số điện thoại',
    address: 'Địa chỉ',
    gender: 'Giới tính',
    genderUnset: 'Không chọn',
    save: 'Lưu thay đổi',
    profileSaved: 'Đã lưu hồ sơ.',
    saveFailed: 'Lưu thất bại',
    changePassword: 'Đổi mật khẩu',
    changePasswordHint:
      'Sau khi đổi, các thiết bị khác đang đăng nhập sẽ bị đăng xuất.',
    currentPassword: 'Mật khẩu hiện tại',
    newPassword: 'Mật khẩu mới',
    confirmPassword: 'Nhập lại mật khẩu mới',
    passwordMismatch: 'Mật khẩu nhập lại không khớp',
    passwordChanged: 'Đã đổi mật khẩu.',
    mustChange:
      'Tài khoản đang dùng mật khẩu tạm. Bạn cần đổi mật khẩu trước khi tiếp tục.',
  },
  gender: {
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
  },
  tenantRoles: {
    TENANT_OWNER: 'Chủ sở hữu',
    TENANT_ADMIN: 'Quản trị viên',
    TEACHER: 'Giáo viên',
    STUDENT: 'Học viên',
    PARENT: 'Phụ huynh',
  },
  systemRoles: {
    SYSTEM_OWNER: 'System Owner',
    SYSTEM_ADMIN: 'System Admin',
    REGISTERED_USER: 'Người dùng',
  },
  userStatus: {
    active: 'Hoạt động',
    locked: 'Đã khoá',
  },
  tenantStatus: {
    pending: 'Chờ duyệt',
    active: 'Đang hoạt động',
    rejected: 'Bị từ chối',
    suspended: 'Tạm khoá',
  },
  membershipStatus: {
    active: 'Đang hoạt động',
    inactive: 'Ngừng kích hoạt',
  },
  admin: {
    loadFailed: 'Không tải được dữ liệu',
    actionFailed: 'Thao tác thất bại',
    all: 'Tất cả',
    actions: 'Thao tác',
    save: 'Lưu',
    stats: {
      newUsers: 'Người dùng mới (7 ngày)',
      lockedUsers: 'Tài khoản bị khoá',
      activeTenants: 'Trung tâm đang hoạt động',
    },
    users: {
      subtitle: 'Tạo, sửa, khoá tài khoản và reset mật khẩu người dùng.',
      create: 'Tạo người dùng',
      edit: 'Sửa người dùng',
      column: 'Người dùng',
      systemRole: 'Vai trò',
      status: 'Trạng thái',
      lastLogin: 'Đăng nhập cuối',
      createdAt: 'Ngày tạo',
      neverLoggedIn: 'Chưa đăng nhập',
      searchPlaceholder: 'Tìm theo họ tên hoặc email…',
      allRoles: 'Mọi vai trò',
      allStatuses: 'Mọi trạng thái',
      mustChangePassword: 'Chờ đổi mật khẩu',
      empty: 'Không có người dùng nào khớp.',
      ownerOnly: 'Chỉ System Owner thao tác được tài khoản quản trị',
      temporaryPassword: 'Mật khẩu tạm',
      passwordHint:
        'Để trống để hệ thống sinh mật khẩu tạm. Người dùng phải đổi mật khẩu ở lần đăng nhập đầu.',
      resetPassword: 'Reset mật khẩu',
      resetHint:
        'Người dùng bị đăng xuất khỏi mọi thiết bị và phải đổi mật khẩu ở lần đăng nhập sau.',
      changeRole: 'Đổi vai trò hệ thống',
      changeRoleHint:
        'Hệ thống luôn cần ít nhất một System Owner đang hoạt động.',
      lock: 'Khoá tài khoản',
      unlock: 'Mở khoá tài khoản',
      lockConfirm: (name: string) =>
        `Khoá tài khoản của ${name}? Người dùng bị đăng xuất ngay và không đăng nhập được cho tới khi mở khoá.`,
      unlockConfirm: (name: string) => `Mở khoá tài khoản của ${name}?`,
      created: 'Đã tạo tài khoản',
      passwordReset: 'Đã reset mật khẩu',
    },
    password: {
      account: 'Tài khoản',
      copy: 'Sao chép',
      copied: 'Đã chép',
      showOnce:
        'Mật khẩu chỉ hiển thị một lần. Hãy gửi cho người dùng qua kênh an toàn.',
      setByAdmin: 'Mật khẩu là mật khẩu bạn vừa nhập.',
      mustChange: 'Người dùng phải đổi mật khẩu ở lần đăng nhập tới.',
    },
    tenants: {
      subtitle: 'Duyệt đăng ký, tạm khoá và đổi gói dịch vụ của trung tâm.',
      column: 'Trung tâm',
      owner: 'Chủ trung tâm',
      plan: 'Gói',
      members: 'Thành viên',
      status: 'Trạng thái',
      createdAt: 'Ngày đăng ký',
      detail: 'Chi tiết',
      searchPlaceholder: 'Tìm theo tên, đường dẫn hoặc chủ trung tâm…',
      empty: 'Không có trung tâm nào.',
      overLimit: 'Vượt giới hạn',
      overLimitWarning: (active: number, max: number) =>
        `Trung tâm đang có ${active} thành viên, vượt giới hạn ${max} của gói này. Thành viên hiện có được giữ nguyên; trung tâm chỉ bị chặn thêm thành viên cho tới khi giảm xuống.`,
      url: 'Đường dẫn',
      email: 'Email',
      phone: 'Số điện thoại',
      address: 'Địa chỉ',
      description: 'Mô tả',
      rejectionReason: 'Lý do từ chối',
      suspensionReason: 'Lý do tạm khoá',
      lastReview: 'Xử lý gần nhất',
      approve: 'Duyệt',
      approveConfirm: (name: string) =>
        `Duyệt trung tâm ${name}? Chủ trung tâm vào được dashboard ngay.`,
      reject: 'Từ chối',
      rejectReasonLabel: 'Lý do từ chối (chủ trung tâm sẽ thấy)',
      suspend: 'Tạm khoá',
      suspendReasonLabel: 'Lý do tạm khoá',
      unsuspend: 'Mở khoá',
      unsuspendConfirm: (name: string) => `Mở khoá trung tâm ${name}?`,
      changePlan: 'Đổi gói',
      currentPlan: '(hiện tại)',
      planOption: (name: string, max: number) =>
        `${name} – tối đa ${max.toLocaleString('vi-VN')} thành viên`,
      ai: {
        title: 'Trợ lý AI',
        hint: 'Cho phép người soạn đề của trung tâm dùng nút "Định dạng bằng AI" trong trình soạn đề. Mỗi lần bấm tính 1 lượt.',
        toggle: 'Bật trợ lý AI',
        quota: 'Hạn mức mỗi tháng',
        quotaOption: (quota: number) =>
          `${quota.toLocaleString('vi-VN')} lượt / tháng`,
        unlimited: 'Không giới hạn',
        used: (used: number, quota: number | null) =>
          quota === null
            ? `Đã dùng ${used.toLocaleString('vi-VN')} lượt tháng này`
            : `Đã dùng ${used.toLocaleString('vi-VN')} / ${quota.toLocaleString('vi-VN')} lượt tháng này`,
      },
    },
    plans: {
      subtitle:
        'Gói dịch vụ giới hạn số thành viên đang hoạt động của trung tâm.',
      create: 'Tạo gói',
      edit: 'Sửa gói',
      code: 'Mã gói',
      codeHint:
        'Chữ thường không dấu, số, "-" hoặc "_". Không đổi được sau khi tạo.',
      name: 'Tên gói',
      maxMembers: 'Thành viên tối đa',
      price: 'Giá (VNĐ)',
      description: 'Mô tả',
      sortOrder: 'Thứ tự',
      isActive: 'Đang áp dụng',
      inactive: 'Ngừng áp dụng',
      activeHint:
        'Gói ngừng áp dụng không chọn được khi đăng ký hay đổi gói; trung tâm đang dùng giữ nguyên.',
      tenantCount: 'Trung tâm',
      empty: 'Chưa có gói dịch vụ.',
      delete: 'Xoá gói',
      deleteConfirm: (name: string) =>
        `Xoá gói ${name}? Thao tác không hoàn tác được.`,
      inUse: 'Gói đang có trung tâm sử dụng, chỉ có thể ngừng áp dụng',
    },
  },
  me: {
    title: 'Không gian của tôi',
    greeting: (name: string) => `Xin chào, ${name}`,
    systemDescription: 'Quản lý người dùng, trung tâm và gói dịch vụ.',
    accountDescription: 'Cập nhật hồ sơ và đổi mật khẩu.',
    tenantsHeading: 'Trung tâm của tôi',
    noTenants: 'Bạn chưa là thành viên của trung tâm nào.',
    noTenantsHint:
      'Hãy đăng ký trung tâm của bạn, hoặc nhờ trung tâm thêm tài khoản này vào danh sách thành viên.',
    registerTenant: 'Đăng ký trung tâm',
    openDashboard: 'Vào dashboard',
    openTenant: 'Trang trung tâm',
    editAndResubmit: 'Sửa và gửi lại',
    pendingHint:
      'Đăng ký đang chờ System Admin duyệt. Bạn vào được trung tâm ngay sau khi được duyệt.',
    rejectedHint:
      'Đăng ký bị từ chối. Hãy sửa thông tin theo lý do bên dưới rồi gửi lại.',
    suspendedHint:
      'Trung tâm đang bị tạm khoá, mọi thành viên tạm thời không vào được.',
    reason: 'Lý do',
    plan: (name: string, max: number) =>
      `Gói ${name} · tối đa ${max.toLocaleString('vi-VN')} thành viên`,
  },
  tenantForm: {
    createTitle: 'Đăng ký trung tâm',
    createSubtitle:
      'Sau khi gửi, System Admin sẽ xem xét và duyệt đăng ký. Bạn là chủ sở hữu của trung tâm.',
    resubmitTitle: 'Sửa và gửi lại đăng ký',
    resubmitSubtitle:
      'Đăng ký sẽ quay về trạng thái chờ duyệt sau khi bạn gửi lại.',
    backToMe: 'Không gian của tôi',
    infoSection: 'Thông tin trung tâm',
    planSection: 'Gói dịch vụ',
    planHint:
      'Gói giới hạn số thành viên đang hoạt động. System Admin có thể đổi gói sau khi duyệt.',
    name: 'Tên trung tâm',
    namePlaceholder: 'Trung tâm Ngoại ngữ Á Châu',
    logo: 'Logo',
    logoHint:
      'Ảnh vuông, tối đa 5MB. Để trống thì dùng chữ cái đầu của tên trung tâm.',
    logoUpload: 'Chọn ảnh',
    logoChange: 'Đổi ảnh',
    logoRemove: 'Bỏ logo',
    logoFailed: 'Tải logo thất bại',
    slug: 'Đường dẫn',
    slugHint:
      '3–40 ký tự: chữ thường không dấu, số và dấu gạch nối. Để trống thì hệ thống tự tạo từ tên.',
    slugErrors: {
      length: 'Đường dẫn phải từ 3 đến 40 ký tự',
      format:
        'Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch nối ở giữa',
      reserved: 'Đường dẫn này đã được hệ thống dành riêng',
    },
    description: 'Giới thiệu',
    descriptionPlaceholder:
      'Các khoá học, kỳ thi luyện tập, địa điểm học… hiển thị trên trang trung tâm.',
    email: 'Email liên hệ',
    phone: 'Số điện thoại',
    address: 'Địa chỉ',
    maxMembers: (max: number) =>
      `Tối đa ${max.toLocaleString('vi-VN')} thành viên`,
    priceContact: 'Liên hệ',
    noPlans: 'Chưa có gói dịch vụ nào đang áp dụng.',
    submit: 'Gửi đăng ký',
    resubmit: 'Gửi lại',
    underAge: (age: number) => `Bạn cần đủ ${age} tuổi để đăng ký trung tâm.`,
    rejectionReason: 'Lý do từ chối',
    notFound: 'Không tìm thấy đăng ký trung tâm này.',
    notRejected:
      'Chỉ sửa và gửi lại được khi đăng ký đang ở trạng thái bị từ chối.',
  },
  tenantAccess: {
    notFound: {
      title: 'Không tìm thấy trung tâm',
      text: 'Đường dẫn không đúng, trung tâm chưa hoạt động hoặc bạn không phải thành viên.',
    },
    pending: {
      title: 'Trung tâm đang chờ duyệt',
      text: 'Trung tâm chưa hoạt động. Chủ sở hữu vào được ngay sau khi System Admin duyệt đăng ký.',
    },
    rejected: {
      title: 'Đăng ký trung tâm bị từ chối',
      text: 'Chủ sở hữu có thể sửa thông tin và gửi lại trong Không gian của tôi.',
    },
    suspended: {
      title: 'Trung tâm đang tạm khoá',
      text: 'Thành viên tạm thời không vào được trung tâm. Vui lòng quay lại sau hoặc liên hệ trung tâm.',
    },
    noDashboard: {
      title: 'Bạn không có quyền vào dashboard',
      text: 'Dashboard dành cho Chủ sở hữu, Quản trị viên và Giáo viên. Bạn vẫn xem được trang trung tâm.',
    },
  },
  tenantPage: {
    yourRoles: 'Vai trò của bạn',
    examsHeading: 'Đề thi',
    noExams: 'Trung tâm chưa công bố đề thi nào.',
    notMember:
      'Bạn chưa là thành viên của trung tâm này. Hãy liên hệ trung tâm để được thêm vào.',
    loginToJoin:
      'Là thành viên của trung tâm? Đăng nhập để xem đề thi và làm bài.',
  },
  tenantDashboard: {
    overLimit: ({
      activeMembers,
      maxMembers,
      planName,
      excess,
    }: {
      activeMembers: number;
      maxMembers: number;
      planName: string;
      excess: number;
    }) =>
      `Trung tâm đang có ${activeMembers.toLocaleString('vi-VN')} thành viên, vượt giới hạn ${maxMembers.toLocaleString('vi-VN')} của gói ${planName}. Cần ngừng kích hoạt ${excess.toLocaleString('vi-VN')} thành viên để khớp gói; tới lúc đó chưa thêm hay kích hoạt lại thành viên được.`,
    manageMembers: 'Quản lý thành viên',
    viewSuggestions: 'Xem gợi ý',
    examsDraft: 'Đề nháp',
    examsPublished: 'Đề đã công bố',
    examsArchived: 'Đề lưu trữ',
    attempts: 'Lượt làm bài',
  },
  members: {
    subtitle:
      'Thêm thành viên, phân vai trò, ngừng kích hoạt và gắn phụ huynh cho học viên.',
    quota: (active: number, max: number) =>
      `${active.toLocaleString('vi-VN')} / ${max.toLocaleString('vi-VN')} thành viên`,
    full: (max: number, plan: string) =>
      `Đã đạt giới hạn ${max.toLocaleString('vi-VN')} thành viên của gói ${plan}, chưa thêm được thành viên mới.`,
    addByEmail: 'Thêm theo email',
    addByEmailHint:
      'Người dùng phải có tài khoản sẵn. Chưa có thì dùng "Tạo tài khoản".',
    add: 'Thêm',
    createAccount: 'Tạo tài khoản',
    created: 'Đã tạo tài khoản thành viên',
    column: 'Thành viên',
    roles: 'Vai trò',
    rolesRequired: 'Vui lòng chọn ít nhất một vai trò',
    status: 'Trạng thái',
    lastActive: 'Lần vào gần nhất',
    neverActive: 'Chưa từng vào',
    joinedAt: 'Ngày tham gia',
    searchPlaceholder: 'Tìm theo họ tên hoặc email…',
    allRoles: 'Mọi vai trò',
    allStatuses: 'Mọi trạng thái',
    empty: 'Không có thành viên nào khớp.',
    minor: '< 18 tuổi',
    detail: 'Chi tiết thành viên',
    ownerLocked: 'Chỉ chủ sở hữu thao tác được trên tài khoản chủ sở hữu',
    ownerRoleFixed:
      'Vai trò Chủ sở hữu cố định; bạn có thể thêm các vai trò khác cho mình.',
    saveRoles: 'Lưu vai trò',
    rolesSaved: 'Đã lưu vai trò.',
    deactivate: 'Ngừng kích hoạt',
    activate: 'Kích hoạt lại',
    deactivateConfirm: (name: string) =>
      `Ngừng kích hoạt ${name}? Thành viên không vào được trung tâm và không còn tính vào giới hạn gói.`,
    activateConfirm: (name: string) =>
      `Kích hoạt lại ${name}? Thành viên được tính lại vào giới hạn gói.`,
    remove: 'Xoá khỏi trung tâm',
    removeConfirm: (name: string) =>
      `Xoá ${name} khỏi trung tâm? Liên kết phụ huynh của thành viên này cũng bị gỡ; tài khoản vẫn giữ nguyên.`,
    guardians: 'Phụ huynh',
    noGuardians: 'Chưa gắn phụ huynh.',
    wards: 'Học viên được giám hộ',
    noWards: 'Chưa gắn với học viên nào.',
    chooseParent: 'Chọn phụ huynh',
    parentSearch: 'Tìm thành viên có vai trò Phụ huynh…',
    noParents: 'Không có Phụ huynh nào khớp.',
    relationship: 'Quan hệ',
    relationshipPlaceholder: 'Vd. Mẹ, Bố',
    link: 'Gắn phụ huynh',
    unlink: 'Gỡ liên kết',
    suggestionsTitle: 'Gợi ý ngừng kích hoạt',
    suggestionsHint: (excess: number) =>
      `Cần ngừng kích hoạt ${excess.toLocaleString('vi-VN')} thành viên. Danh sách gồm Học viên/Phụ huynh lâu không vào trung tâm, người chưa từng vào xếp trước. Đây chỉ là gợi ý, bạn tự quyết định.`,
    noSuggestions:
      'Không còn Học viên/Phụ huynh nào để gợi ý. Hãy xem lại các thành viên khác trong danh sách.',
    withinLimit: 'Số thành viên đã khớp giới hạn gói.',
  },
  site: {
    navFeatures: 'Tính năng',
    navPlans: 'Gói dịch vụ',
    heroBadge: 'TOEIC · IELTS · JLPT',
    heroTitle: 'Luyện thi ngoại ngữ cho cả trung tâm, trên một nền tảng.',
    heroText:
      'Soạn đề theo cấu trúc kỳ thi, cho học viên thi thử có tính giờ, chấm tự động phần trắc nghiệm và để giáo viên chấm Writing, Speaking.',
    registerCenter: 'Đăng ký trung tâm',
    viewPlans: 'Xem gói dịch vụ',
    myWorkspace: 'Không gian của tôi',
    heroNote:
      'Học viên và giáo viên: đăng nhập bằng tài khoản trung tâm cấp để vào thi hoặc soạn đề.',
    preview: {
      title: 'Đề thi thử · IELTS Academic',
      duration: '165 phút',
      sections: [
        {
          title: 'Listening',
          meta: '4 part · 40 câu · chấm tự động',
          value: '30 phút',
        },
        {
          title: 'Reading',
          meta: '3 passage · 40 câu · chấm tự động',
          value: '60 phút',
        },
        { title: 'Writing', meta: '2 task · giáo viên chấm', value: '60 phút' },
        {
          title: 'Speaking',
          meta: '3 part · ghi âm trên trình duyệt',
          value: '15 phút',
        },
      ],
      progressLabel: 'Đang làm · Section 2/4',
      progressValue: 'còn 42:10',
      stats: [
        { value: '5', label: 'vai trò trong trung tâm' },
        { value: '4', label: 'kỹ năng Nghe · Đọc · Viết · Nói' },
        { value: '0–10', label: 'thang điểm chấm tay' },
      ],
    },
    featuresEyebrow: 'Tính năng',
    featuresTitle:
      'Từ soạn đề tới chấm bài, gọn trong không gian của trung tâm',
    features: [
      {
        title: 'Soạn đề theo cấu trúc kỳ thi',
        body: 'Tạo đề từ loại đề dựng sẵn cho TOEIC, IELTS, JLPT; mỗi section là một tab soạn thảo riêng, tự lưu phiên bản khi đề đã có bài làm.',
        stat: '↳ đánh số câu lại từ 1 mỗi section',
      },
      {
        title: 'Thi thử có tính giờ',
        body: 'Học viên làm từng section với đồng hồ đếm ngược, hết giờ tự nộp; phần Speaking ghi âm ngay trên trình duyệt.',
        stat: '↳ tải lại trang vẫn giữ bài và thời gian',
      },
      {
        title: 'Chấm tự động và chấm tay',
        body: 'Trắc nghiệm chấm ở server nên không lộ đáp án; giáo viên chấm Writing, Speaking kèm điểm và nhận xét.',
        stat: '↳ học viên xem kết quả theo từng section',
      },
    ],
    plansEyebrow: 'Gói dịch vụ',
    plansTitle: 'Chọn gói theo quy mô trung tâm',
    plansText:
      'Gói giới hạn số thành viên đang hoạt động, gồm giáo viên, học viên và phụ huynh. Đăng ký được System Admin duyệt, gói có thể đổi sau.',
    choosePlan: 'Chọn gói này',
    plansFailed: 'Không tải được danh sách gói dịch vụ.',
    footerText:
      'Nền tảng quản lý trung tâm ngoại ngữ: soạn đề, thi thử có tính giờ và chấm bài.',
    footerProduct: 'Sản phẩm',
    footerAccount: 'Tài khoản',
  },
  catalog: {
    scope: { system: 'Hệ thống', tenant: 'Trung tâm' },
    systemHint: 'Mục của hệ thống chỉ xem được',
    allScopes: 'Mọi phạm vi',
    allStatuses: 'Mọi trạng thái',
    active: 'Đang dùng',
    inactive: 'Ngừng dùng',
    code: 'Mã',
    codeHint:
      'Chữ in hoa không dấu, số, "-" hoặc "_" (tự đổi sang in hoa). Không trùng trong cùng phạm vi.',
    name: 'Tên',
    description: 'Mô tả',
    sortOrder: 'Thứ tự',
    status: 'Trạng thái',
    scopeColumn: 'Phạm vi',
    actions: 'Thao tác',
    view: 'Xem chi tiết',
    readOnly: 'Bạn chỉ có quyền xem.',
    saveFailed: 'Lưu thất bại',
    deleteFailed: 'Xoá thất bại',
    categories: {
      subtitle:
        'Nhóm loại đề và mẫu bài học theo ngôn ngữ hoặc chương trình (Tiếng Anh, Tiếng Nhật…).',
      tenantSubtitle:
        'Gồm danh mục của hệ thống và danh mục riêng của trung tâm, dùng chung cho loại đề, mẫu bài học và khoá học.',
      create: 'Tạo danh mục',
      edit: 'Sửa danh mục',
      delete: 'Xoá danh mục',
      deleteConfirm: (name: string) =>
        `Xoá danh mục ${name}? Thao tác không hoàn tác được.`,
      inUse:
        'Danh mục đang có loại đề, mẫu bài học hoặc khoá học, chỉ có thể ngừng dùng',
      examBlueprintCount: 'Loại đề',
      lessonBlueprintCount: 'Mẫu bài học',
      courseCount: 'Khoá học',
      icon: 'Biểu tượng',
      color: 'Màu',
      activeHint:
        'Danh mục ngừng dùng không chọn được khi tạo loại đề, mẫu bài học mới; mục đã có giữ nguyên.',
      empty: 'Chưa có danh mục.',
      searchPlaceholder: 'Tìm theo tên hoặc mã danh mục',
    },
    blueprints: {
      subtitle:
        'Loại đề gồm các module (Listening, Reading…) với thời lượng tham khảo, dùng để sinh section khi tạo đề.',
      tenantSubtitle:
        'Gồm loại đề của hệ thống và loại đề riêng của trung tâm. Loại đề của trung tâm có thể thuộc danh mục hệ thống.',
      create: 'Tạo loại đề',
      edit: 'Sửa loại đề',
      detail: 'Chi tiết loại đề',
      delete: 'Xoá loại đề',
      deleteConfirm: (name: string) =>
        `Xoá loại đề ${name} cùng các module? Thao tác không hoàn tác được.`,
      category: 'Danh mục',
      allCategories: 'Mọi danh mục',
      chooseCategory: 'Chọn danh mục',
      noCategory:
        'Chưa có danh mục đang dùng. Hãy tạo danh mục trước khi tạo loại đề.',
      inactiveCategory: (name: string) => `${name} (ngừng dùng)`,
      modules: 'Module',
      examCount: 'Số đề',
      examCountHint: 'Số đề thi của mọi trung tâm dùng loại đề này',
      examCountTenantHint: 'Số đề thi của trung tâm dùng loại đề này',
      inUse: 'Loại đề đang có đề thi, chỉ có thể ngừng dùng',
      moduleCount: (count: number, minutes: number) =>
        `${count} module · ${minutes} phút`,
      activeHint:
        'Loại đề ngừng dùng không chọn được khi tạo đề mới; đề đã tạo giữ nguyên.',
      empty: 'Chưa có loại đề.',
      searchPlaceholder: 'Tìm theo tên hoặc mã loại đề',
      moduleName: 'Tên module',
      moduleCode: 'Mã module',
      moduleDuration: 'Thời lượng tham khảo',
      moduleDescription: 'Mô tả module',
      addModule: 'Thêm module',
      removeModule: 'Xoá module',
      moveUp: 'Chuyển lên',
      moveDown: 'Chuyển xuống',
      dragHint: 'Kéo để sắp xếp',
      modulesHint:
        'Kéo thả hoặc dùng nút mũi tên để sắp xếp. Sửa module không ảnh hưởng đề đã tạo.',
      minutes: (value: number) => `${value} phút`,
      needModule: 'Loại đề phải có ít nhất 1 module',
      duplicateModuleCode: (code: string) => `Mã module bị trùng: ${code}`,
    },
    lessonBlueprints: {
      subtitle:
        'Mẫu bài học gồm các phần (Từ vựng, Ngữ pháp…), dùng để sinh section khi tạo bài học. Phần không có thời lượng.',
      tenantSubtitle:
        'Gồm mẫu bài học của hệ thống và mẫu riêng của trung tâm. Mẫu của trung tâm có thể thuộc danh mục hệ thống.',
      create: 'Tạo mẫu bài học',
      edit: 'Sửa mẫu bài học',
      detail: 'Chi tiết mẫu bài học',
      delete: 'Xoá mẫu bài học',
      deleteConfirm: (name: string) =>
        `Xoá mẫu bài học ${name} cùng các phần? Thao tác không hoàn tác được.`,
      noCategory:
        'Chưa có danh mục đang dùng. Hãy tạo danh mục trước khi tạo mẫu bài học.',
      modules: 'Phần',
      moduleCount: (count: number) => `${count} phần`,
      lessonCount: 'Số bài học',
      lessonCountHint: 'Số bài học của mọi trung tâm dùng mẫu này',
      lessonCountTenantHint: 'Số bài học của trung tâm dùng mẫu này',
      inUse: 'Mẫu đang có bài học, chỉ có thể ngừng dùng',
      activeHint:
        'Mẫu ngừng dùng không chọn được khi tạo bài học mới; bài học đã tạo giữ nguyên.',
      empty: 'Chưa có mẫu bài học.',
      searchPlaceholder: 'Tìm theo tên hoặc mã mẫu bài học',
      moduleName: 'Tên phần',
      moduleCode: 'Mã phần',
      moduleDescription: 'Mô tả phần',
      addModule: 'Thêm phần',
      removeModule: 'Xoá phần',
      modulesHint:
        'Kéo thả hoặc dùng nút mũi tên để sắp xếp. Sửa phần không ảnh hưởng bài học đã tạo.',
      needModule: 'Mẫu bài học phải có ít nhất 1 phần',
      duplicateModuleCode: (code: string) => `Mã phần bị trùng: ${code}`,
    },
  },
  exams: {
    subtitle:
      'Tạo đề từ loại đề, soạn nội dung từng section và publish cho học viên. Teacher sửa được đề do mình tạo, xem được mọi đề.',
    create: 'Tạo đề',
    column: 'Đề thi',
    content: 'Nội dung',
    statusColumn: 'Trạng thái',
    creator: 'Người tạo',
    updatedAt: 'Cập nhật',
    noCreator: '—',
    empty: 'Chưa có đề thi nào.',
    searchPlaceholder: 'Tìm theo tên đề',
    allStatuses: 'Mọi trạng thái',
    allCategories: 'Mọi danh mục',
    allBlueprints: 'Mọi loại đề',
    allCreators: 'Mọi người tạo',
    status: {
      draft: 'Nháp',
      published: 'Đã publish',
      archived: 'Lưu trữ',
    },
    contentSummary: (sections: number, minutes: number) =>
      `${sections} section · ${minutes} phút`,
    questionSummary: (questions: number, version: number) =>
      `${questions} câu · version ${version}`,
    edit: 'Soạn đề',
    view: 'Xem đề',
    clone: 'Nhân bản',
    cloneConfirm: (title: string) =>
      `Nhân bản đề ${title}? Bản sao là đề nháp mới của bạn, chép nội dung version hiện tại (media dùng chung với đề gốc), không chép bài làm.`,
    cloned: (title: string) => `Đã nhân bản thành ${title}.`,
    visibility: {
      tenant: 'Công khai trong trung tâm',
      private: 'Chỉ qua lớp',
    },
    privateBadge: 'Chỉ qua lớp',
    clonedFrom: (title: string) => `Bản sao của ${title}`,
    versions: 'Các version',
    publish: 'Publish',
    republish: 'Publish lại',
    archive: 'Lưu trữ',
    delete: 'Xoá đề',
    actionFailed: 'Thao tác thất bại',
    publishedNotice: (title: string) => `Đã publish đề ${title}.`,
    archived: (title: string) => `Đã lưu trữ đề ${title}.`,
    deleted: (title: string) => `Đã xoá đề ${title}.`,
    archiveConfirm: (title: string) =>
      `Lưu trữ đề ${title}? Học viên không thấy đề nữa; bạn vẫn sửa và publish lại được.`,
    deleteConfirm: (title: string) =>
      `Xoá đề ${title}? Đề chưa có bài làm bị xoá hẳn; đề đã có bài làm được ẩn đi để giữ kết quả.`,
    form: {
      createTitle: 'Tạo đề thi',
      editTitle: 'Thông tin đề',
      create: 'Tạo và soạn đề',
      save: 'Lưu thông tin',
      blueprint: 'Loại đề',
      chooseBlueprint: 'Chọn loại đề',
      noBlueprint:
        'Chưa có loại đề đang dùng. Hãy nhờ Owner/Admin tạo loại đề trước.',
      blueprintOption: (name: string, modules: number, scope: string) =>
        `${name} · ${modules} module · ${scope}`,
      inactiveBlueprint: (name: string) => `${name} (ngừng dùng)`,
      sectionsFromModules: (modules: string) =>
        `Đề sẽ có các section: ${modules}. Sau khi tạo vẫn thêm/xoá/đổi được.`,
      blueprintChangeHint:
        'Đổi loại đề không đổi các section đang có; dùng "Thêm section → từ module" để thêm section của loại đề mới.',
      title: 'Tên đề',
      titlePlaceholder: 'VD: IELTS Mock Test 01',
      description: 'Mô tả',
      visibility: 'Hiển thị',
      visibilityHint: {
        tenant:
          'Mọi thành viên thấy đề ở trang trung tâm và làm tự do (khi đề đã publish).',
        private:
          'Không hiện ở trang trung tâm; học viên chỉ làm khi đề được giao qua lớp. Bài làm tự do cũ vẫn xem lại được.',
      },
    },
    versionsPage: {
      back: 'Về trình soạn',
      subtitle:
        'Version mới chỉ được tạo khi lưu đề mà version hiện tại đã có bài làm. Khôi phục = lưu lại nội dung version đó theo cùng quy tắc.',
      version: 'Version',
      current: 'Hiện tại',
      savedAt: 'Lưu lúc',
      savedBy: 'Người lưu',
      attempts: 'Bài làm',
      questions: (count: number) => `${count} câu`,
      view: 'Xem nội dung',
      restore: 'Khôi phục version',
      restoreOverwrite: (version: number, current: number) =>
        `Nội dung version ${current} (chưa có bài làm) sẽ bị ghi đè bằng nội dung version ${version}. Tiếp tục?`,
      restoreAsNew: (version: number, next: number) =>
        `Version hiện tại đã có bài làm nên sẽ tạo version ${next} với nội dung version ${version}. Tiếp tục?`,
      restored: (version: number, current: number) =>
        `Đã khôi phục nội dung version ${version} thành version ${current}.`,
      empty: 'Chưa có version nào.',
    },
  },
  // Bài học (req-3 Step 4): chuỗi riêng, phần giống đề thi dùng `exams`.
  lessons: {
    subtitle:
      'Tạo bài học từ mẫu bài học, soạn nội dung từng phần (tab) và publish. Teacher sửa được bài học do mình tạo, xem và nhân bản được mọi bài đã publish.',
    create: 'Tạo bài học',
    column: 'Bài học',
    empty: 'Chưa có bài học nào.',
    searchPlaceholder: 'Tìm theo tên bài học',
    allBlueprints: 'Mọi mẫu bài học',
    contentSummary: (sections: number) => `${sections} section`,
    edit: 'Soạn bài học',
    view: 'Xem bài học',
    delete: 'Xoá bài học',
    cloneConfirm: (title: string) =>
      `Nhân bản bài học ${title}? Bản sao là bài nháp mới của bạn, chép nội dung version hiện tại (media dùng chung với bài gốc), không chép lượt học.`,
    publishedNotice: (title: string) => `Đã publish bài học ${title}.`,
    archived: (title: string) => `Đã lưu trữ bài học ${title}.`,
    deleted: (title: string) => `Đã xoá bài học ${title}.`,
    archiveConfirm: (title: string) =>
      `Lưu trữ bài học ${title}? Không giao được vào giáo trình nữa; bạn vẫn sửa và publish lại được.`,
    deleteConfirm: (title: string) =>
      `Xoá bài học ${title}? Bài chưa có lượt học bị xoá hẳn; bài đã có lượt học được ẩn đi để giữ kết quả.`,
    form: {
      createTitle: 'Tạo bài học',
      editTitle: 'Thông tin bài học',
      create: 'Tạo và soạn bài học',
      save: 'Lưu thông tin',
      blueprint: 'Mẫu bài học',
      chooseBlueprint: 'Chọn mẫu bài học',
      noBlueprint:
        'Chưa có mẫu bài học đang dùng. Hãy nhờ Owner/Admin tạo mẫu bài học trước.',
      blueprintOption: (name: string, modules: number, scope: string) =>
        `${name} · ${modules} phần · ${scope}`,
      sectionsFromModules: (modules: string) =>
        `Bài học sẽ có các section: ${modules}. Sau khi tạo vẫn thêm/xoá/đổi được.`,
      blueprintChangeHint:
        'Đổi mẫu không đổi các section đang có; dùng "Thêm section → từ phần của mẫu" để thêm section của mẫu mới.',
      title: 'Tên bài học',
      titlePlaceholder: 'VD: Minna no Nihongo – Bài 1',
      visibilityHint: {
        tenant:
          'Mọi thành viên thấy bài ở trang trung tâm và học tự do (khi bài đã publish).',
        private:
          'Không hiện ở trang trung tâm; học viên chỉ học khi bài được giao qua lớp.',
      },
    },
    versionsPage: {
      subtitle:
        'Version mới chỉ được tạo khi lưu bài học mà version hiện tại đã có lượt học. Khôi phục = lưu lại nội dung version đó theo cùng quy tắc.',
      attempts: 'Lượt học',
      restoreOverwrite: (version: number, current: number) =>
        `Nội dung version ${current} (chưa có lượt học) sẽ bị ghi đè bằng nội dung version ${version}. Tiếp tục?`,
      restoreAsNew: (version: number, next: number) =>
        `Version hiện tại đã có lượt học nên sẽ tạo version ${next} với nội dung version ${version}. Tiếp tục?`,
    },
  },
  lessonEditor: {
    backToList: 'Về danh sách bài học',
    readOnlyHint:
      'Bạn chỉ xem được bài học này (Teacher chỉ sửa bài do mình tạo). Vẫn xem trước, xem các version và nhân bản bài đã publish được.',
    summary: (sections: number, questions: number) =>
      `${sections} section · ${questions} câu hỏi`,
    metadata: 'Thông tin bài học',
    published: 'Đã publish bài học.',
    archived: 'Đã lưu trữ bài học.',
    newVersionConfirm: (version: number) =>
      `Version hiện tại đã có lượt học nên lần lưu này sẽ tạo version ${version}. Lượt học cũ giữ nguyên nội dung version cũ. Tiếp tục?`,
    tabs: {
      cannotRemove: 'Bài học phải có ít nhất 1 section',
      fromModule: 'Từ phần của mẫu bài học',
    },
  },
  // Khoá học & giáo trình tham khảo (req-3 Step 6).
  courses: {
    subtitle:
      'Khoá học của trung tâm (vd. Tiếng Nhật N5). Owner/Admin tạo, sửa, lưu trữ và gắn giáo trình tham khảo; Teacher chỉ xem.',
    create: 'Tạo khoá học',
    column: 'Khoá học',
    level: 'Trình độ',
    plannedSessions: 'Số buổi dự kiến',
    sessions: (count: number) => `${count} buổi`,
    curriculumCount: 'Giáo trình',
    classCount: 'Lớp',
    empty: 'Chưa có khoá học nào.',
    searchPlaceholder: 'Tìm theo tên hoặc mã khoá học',
    allStatuses: 'Mọi trạng thái',
    status: { active: 'Đang dùng', archived: 'Lưu trữ' },
    view: 'Xem khoá học',
    edit: 'Sửa khoá học',
    archive: 'Lưu trữ',
    unarchive: 'Dùng lại',
    delete: 'Xoá khoá học',
    archived: (name: string) => `Đã lưu trữ khoá học ${name}.`,
    unarchived: (name: string) => `Khoá học ${name} đã được dùng lại.`,
    deleted: (name: string) => `Đã xoá khoá học ${name}.`,
    archiveConfirm: (name: string) =>
      `Lưu trữ khoá học ${name}? Không tạo được lớp mới từ khoá học này; lớp đang có vẫn học bình thường.`,
    deleteConfirm: (name: string) =>
      `Xoá khoá học ${name}? Các giáo trình đang gắn chỉ bị bỏ gắn, vẫn còn trong thư viện Giáo trình.`,
    deleteBlocked: 'Khoá học đã có lớp học, chỉ lưu trữ được.',
    backToList: 'Về danh sách khoá học',
    tabs: {
      info: 'Thông tin',
      curricula: 'Giáo trình tham khảo',
      classes: 'Lớp',
      schedule: 'Lịch',
    },
    noValue: '—',
    noCategory: 'Không có danh mục',
    readOnlyHint: 'Teacher chỉ xem khoá học; Owner/Admin quản lý khoá học.',
    curriculaHint:
      'Giáo trình tham khảo giúp giáo viên biết khoá học gồm những nội dung nào. Khi tạo lớp sẽ chọn 1 giáo trình để sao chép sang lớp. Một giáo trình gắn được vào nhiều khoá học.',
    attach: 'Gắn giáo trình',
    attachPlaceholder: 'Chọn giáo trình để gắn',
    noCurriculumToAttach: 'Không còn giáo trình nào chưa gắn.',
    detach: 'Bỏ gắn',
    detachConfirm: (name: string) =>
      `Bỏ gắn giáo trình ${name} khỏi khoá học? Giáo trình vẫn còn trong thư viện.`,
    attached: (name: string) => `Đã gắn giáo trình ${name}.`,
    detached: (name: string) => `Đã bỏ gắn giáo trình ${name}.`,
    noCurricula: 'Chưa gắn giáo trình tham khảo nào.',
    form: {
      createTitle: 'Tạo khoá học',
      editTitle: 'Sửa khoá học',
      code: 'Mã khoá học',
      codeHint:
        'Chữ in hoa không dấu, số và dấu "-" hoặc "_" ở giữa, vd. N5-2026.',
      name: 'Tên khoá học',
      namePlaceholder: 'VD: Tiếng Nhật N5',
      description: 'Mô tả',
      category: 'Danh mục',
      noCategory: 'Không chọn danh mục',
      inactiveCategory: (name: string) => `${name} (ngừng dùng)`,
      cover: 'Ảnh bìa',
      chooseCover: 'Chọn ảnh',
      removeCover: 'Bỏ ảnh',
      level: 'Trình độ',
      levelPlaceholder: 'VD: N5, A2',
      plannedSessions: 'Số buổi dự kiến',
      plannedSessionsHint: 'Lớp tạo từ khoá học lấy làm số buổi mặc định.',
      create: 'Tạo khoá học',
      save: 'Lưu',
    },
  },
  curricula: {
    subtitle:
      'Thư viện giáo trình tham khảo của trung tâm: chia chương, mỗi chương gồm bài học và đề thi đã publish. Teacher tạo và sửa giáo trình của mình, xem và nhân bản mọi giáo trình.',
    create: 'Tạo giáo trình',
    column: 'Giáo trình',
    courses: 'Khoá học đang gắn',
    noCourse: 'Chưa gắn khoá học',
    content: 'Nội dung',
    summary: (groups: number, items: number) =>
      `${groups} chương · ${items} mục`,
    empty: 'Chưa có giáo trình nào.',
    searchPlaceholder: 'Tìm theo tên giáo trình',
    allCourses: 'Mọi khoá học',
    open: 'Mở giáo trình',
    clone: 'Nhân bản',
    cloneConfirm: (name: string) =>
      `Nhân bản giáo trình ${name}? Bản sao là giáo trình mới của bạn, chép các chương và mục, không gắn vào khoá học nào.`,
    delete: 'Xoá giáo trình',
    deleteConfirm: (name: string) =>
      `Xoá giáo trình ${name}? Các chương và mục bị xoá theo; lớp đã sao chép giáo trình không bị ảnh hưởng.`,
    deleted: (name: string) => `Đã xoá giáo trình ${name}.`,
    clonedFrom: (name: string) => `Bản sao của ${name}`,
    backToList: 'Về danh sách giáo trình',
    readOnlyHint:
      'Bạn chỉ xem được giáo trình này (Teacher chỉ sửa giáo trình do mình tạo). Có thể nhân bản để có bản của mình.',
    metadata: 'Thông tin giáo trình',
    save: 'Lưu giáo trình',
    saved: 'Đã lưu giáo trình.',
    unsaved: 'Có thay đổi chưa lưu',
    leaveConfirm: 'Giáo trình có thay đổi chưa lưu. Rời trang?',
    addGroup: 'Thêm chương',
    newGroupTitle: (index: number) => `Chương ${index}`,
    groupTitle: 'Tên chương',
    removeGroup: 'Xoá chương',
    removeGroupHint: 'Các mục của chương chuyển về "Chưa xếp chương".',
    moveUp: 'Lên',
    moveDown: 'Xuống',
    dragHint: 'Kéo để sắp xếp',
    ungrouped: 'Chưa xếp chương',
    ungroupedHint: 'Mục chưa thuộc chương nào, hiện ở đầu giáo trình.',
    emptyGroup: 'Chưa có mục. Kéo mục vào đây hoặc bấm "Thêm mục".',
    addItem: 'Thêm mục',
    removeItem: 'Bỏ mục',
    itemDetails: 'Tên hiển thị & ghi chú',
    itemTitle: 'Tên hiển thị',
    itemTitleHint: 'Để trống để dùng tên bài học/đề thi.',
    itemNote: 'Ghi chú cho giáo viên',
    moveToGroup: 'Chương',
    originalTitle: (title: string) => `Gốc: ${title}`,
    archivedWarning: 'Đã lưu trữ',
    archivedHint:
      'Bài học/đề thi đã lưu trữ: vẫn nằm trong giáo trình, nhưng hãy cân nhắc thay bằng bài khác.',
    itemType: { lesson: 'Bài học', exam: 'Đề thi' },
    labelField: 'Nhãn',
    label: {
      lesson: 'Bài học',
      homework: 'Bài tập',
      quiz: 'Bài kiểm tra',
      final: 'Bài thi',
    },
    picker: {
      title: 'Thêm mục vào giáo trình',
      hint: 'Chỉ chọn được bài học/đề thi đã publish. Mỗi bài/đề chỉ thêm một lần vào giáo trình.',
      search: 'Tìm theo tên',
      added: 'Đã có',
      add: 'Thêm',
      empty: 'Không có bài học/đề thi đã publish phù hợp.',
      addedCount: (count: number) => `Đã thêm ${count} mục`,
      done: 'Xong',
    },
    form: {
      createTitle: 'Tạo giáo trình',
      editTitle: 'Thông tin giáo trình',
      name: 'Tên giáo trình',
      namePlaceholder: 'VD: Giáo trình N5 – Minna no Nihongo',
      description: 'Mô tả',
      create: 'Tạo giáo trình',
      save: 'Lưu',
    },
  },
  // Lớp học & giáo trình lớp (req-3 Step 7).
  classes: {
    subtitle:
      'Lớp học tạo từ khoá học. Owner/Admin tạo lớp, đổi trạng thái, thêm giáo viên và học viên; giáo viên của lớp sửa giáo trình lớp. Teacher chỉ thấy lớp mình phụ trách.',
    teacherSubtitle:
      'Các lớp bạn phụ trách. Bạn sửa được giáo trình của lớp; Owner/Admin quản lý thông tin, giáo viên và học viên.',
    create: 'Tạo lớp',
    column: 'Lớp học',
    course: 'Khoá học',
    startDate: 'Bắt đầu',
    teachers: 'Giáo viên',
    students: 'Học viên',
    studentCount: (count: number, max: number | null) =>
      max === null ? `${count}` : `${count}/${max}`,
    noTeacher: 'Chưa có giáo viên',
    empty: 'Chưa có lớp học nào.',
    emptyForTeacher: 'Bạn chưa phụ trách lớp nào.',
    searchPlaceholder: 'Tìm theo tên hoặc mã lớp',
    allStatuses: 'Mọi trạng thái',
    allCourses: 'Mọi khoá học',
    status: {
      upcoming: 'Sắp mở',
      ongoing: 'Đang học',
      finished: 'Đã kết thúc',
      cancelled: 'Đã huỷ',
    },
    view: 'Mở lớp',
    edit: 'Sửa thông tin',
    delete: 'Xoá lớp',
    deleteConfirm: (name: string) =>
      `Xoá lớp ${name}? Giáo trình lớp, danh sách giáo viên/học viên và nhật ký bị xoá theo. Chỉ xoá được khi chưa có bài làm.`,
    deleted: (name: string) => `Đã xoá lớp ${name}.`,
    deleteBlocked:
      'Lớp đã có bài làm của học viên nên không xoá được, chỉ chuyển sang "Đã huỷ".',
    backToList: 'Về danh sách lớp',
    tabs: {
      info: 'Thông tin',
      schedule: 'Thời khoá biểu',
      members: 'Giáo viên & Học viên',
      curriculum: 'Giáo trình',
      progress: 'Tiến độ & Chuyên cần',
      gradebook: 'Bảng điểm',
      logs: 'Nhật ký thay đổi',
    },
    noValue: '—',
    endDate: 'Ngày kết thúc',
    endDatePending: 'Tính khi có thời khoá biểu',
    sessions: (count: number) => `${count} buổi`,
    unlimited: 'Không giới hạn',
    sourceCurriculum: 'Giáo trình đã chép',
    noSourceCurriculum: 'Không chép giáo trình nào',
    readOnlyHint:
      'Owner/Admin sửa thông tin lớp, đổi trạng thái, thêm/xoá giáo viên và học viên.',
    closedHint:
      'Lớp đã kết thúc hoặc đã huỷ: chỉ xem, không sửa giáo trình và danh sách giáo viên/học viên.',
    noTeacherWarning:
      'Lớp chưa có giáo viên. Hãy thêm giáo viên ở tab "Giáo viên & Học viên".',
    overCapacity: (count: number, max: number) =>
      `Lớp đang vượt sĩ số: ${count}/${max} học viên.`,
    courseTabHint:
      'Các lớp mở từ khoá học này. Tạo lớp mới sẽ chép 1 giáo trình tham khảo của khoá học sang lớp.',
    statusActions: {
      title: 'Đổi trạng thái',
      to: {
        upcoming: 'Chuyển về "Sắp mở"',
        ongoing: 'Bắt đầu học',
        finished: 'Kết thúc lớp',
        cancelled: 'Huỷ lớp',
      },
      reopen: 'Mở lại lớp',
      confirm: {
        upcoming: (name: string) => `Chuyển lớp ${name} về "Sắp mở"?`,
        ongoing: (name: string) =>
          `Chuyển lớp ${name} sang "Đang học"? Học viên vào học được các mục đã mở.`,
        finished: (name: string) =>
          `Kết thúc lớp ${name}? Học viên không nộp bài được nữa; giáo trình và danh sách giáo viên/học viên bị khoá. Mở lại được sau.`,
        cancelled: (name: string) =>
          `Huỷ lớp ${name}? Lớp đã huỷ chỉ xem được và không mở lại được nữa.`,
      },
      inProgress: (count: number) =>
        `Có ${count} lượt thi đang làm dở: các lượt này sẽ bị chốt ngay (câu đã trả lời được chấm, phần chưa làm tính 0) và không mở lại khi lớp mở lại.`,
      done: (status: string) => `Lớp đã chuyển sang "${status}".`,
    },
    // Chuyên cần & bảng điểm (req-3 Step 11).
    progress: {
      hint: 'Chỉ mục đề thi có hạn nộp được tính chuyên cần: đúng hạn 1 điểm, muộn tính theo hệ số k, quá hạn chưa nộp 0 điểm. Mục chưa tới hạn, lượt đang làm dở và lần thi lại không bắt buộc không vào mẫu số.',
      lateRule:
        'Đúng hạn hay muộn xét theo lúc bắt đầu lượt thi (hạn nộp là hạn bắt đầu).',
      empty: 'Giáo trình lớp chưa có mục đề thi nào đặt hạn nộp.',
      noStudents: 'Lớp chưa có học viên.',
      student: 'Học viên',
      rate: 'Tỉ lệ chuyên cần',
      counted: (count: number) => `${count} mục tính`,
      tally: (onTime: number, late: number, missed: number) =>
        `Đúng hạn ${onTime} · Muộn ${late} · Chưa nộp ${missed}`,
      marks: {
        on_time: 'Đúng hạn',
        late: 'Muộn',
        missed: 'Chưa nộp',
        in_progress: 'Đang làm',
        pending: 'Chưa tới hạn',
        excluded: 'Không tính',
      },
      deadline: (value: string) => `Hạn nộp: ${value}`,
      startedAt: (value: string) => `Bắt đầu: ${value}`,
      attemptIndex: (index: number) => `Lần ${index}`,
      acceptLate: 'Nhận bài quá hạn',
      noLate: 'Không nhận bài quá hạn',
      below: (threshold: number) => `Dưới ngưỡng ${threshold}%`,
      belowCount: (count: number, threshold: number) =>
        `${count} học viên có tỉ lệ chuyên cần dưới ${threshold}%.`,
      showRemoved: 'Hiện học viên đã rời lớp',
      removed: 'Đã rời lớp',
      inactive: 'Đã ngừng',
      export: 'Xuất Excel',
      exportFailed: 'Không xuất được file Excel',
      params: {
        title: 'Tham số chuyên cần của lớp',
        lateWeight: 'Hệ số nộp muộn (k)',
        warningThreshold: 'Ngưỡng cảnh báo (%)',
        placeholder: 'Theo trung tâm',
        hint: 'Để trống để dùng cài đặt của trung tâm.',
        tenantValue: (value: string) => `Trung tâm: ${value}`,
        save: 'Lưu tham số',
        saved: 'Đã lưu tham số chuyên cần của lớp.',
        readOnly: 'Chỉ Owner/Admin sửa được tham số của lớp.',
      },
    },
    gradebook: {
      hint: 'Nhóm thi (mục gốc + các lần thi lại) gộp 1 cột, lấy điểm cao nhất trong các lượt đã chấm. Mục bài học hiện % câu tự chấm của lần nộp gần nhất.',
      empty: 'Giáo trình lớp chưa có mục nào.',
      allGroups: 'Mọi chương',
      ungrouped: 'Chưa xếp chương',
      average: (title: string) => `TB ${title}`,
      averageHint: 'Trung bình điểm các nhóm thi đã có điểm trong chương.',
      pending: 'Chờ chấm',
      notStarted: 'Chưa thi',
      noScore: 'Chưa có điểm',
      passed: 'Đậu',
      failed: 'Trượt',
      threshold: (value: number) => `Ngưỡng đậu ${value}%`,
      lessonNotStarted: 'Chưa học',
      lessonInProgress: 'Đang học',
      lessonDone: 'Đã học xong',
      hasPending: 'Còn lượt chờ chấm',
      attemptLine: (index: number, value: string) => `Lần ${index}: ${value}`,
      comment: 'Nhận xét cuối khoá',
      commentEmpty: 'Chưa có',
      commentEdit: 'Viết nhận xét',
      commentTitle: (name: string) => `Nhận xét cuối khoá – ${name}`,
      commentPlaceholder:
        'Nhận xét về kết quả học tập, điểm mạnh, điểm cần cải thiện…',
      commentHint:
        'Học viên và phụ huynh chỉ thấy nhận xét khi lớp đã kết thúc. Để trống để xoá nhận xét.',
      commentSaved: 'Đã lưu nhận xét.',
      commentCleared: 'Đã xoá nhận xét.',
      commentClosed:
        'Chỉ viết được nhận xét khi lớp đang học hoặc đã kết thúc.',
      commentBy: (name: string, at: string) => `${name} · ${at}`,
      openAttempts: 'Bài làm chi tiết',
    },
    form: {
      createTitle: 'Tạo lớp học',
      editTitle: 'Sửa thông tin lớp',
      course: 'Khoá học',
      coursePlaceholder: 'Chọn khoá học đang dùng',
      courseFixed: 'Không đổi khoá học sau khi tạo lớp.',
      curriculum: 'Giáo trình tham khảo',
      noCurriculum: 'Không chép giáo trình',
      curriculumHint:
        'Chép chương và mục của giáo trình sang giáo trình lớp. Sau đó giáo viên sửa giáo trình lớp tự do, không ảnh hưởng giáo trình gốc.',
      code: 'Mã lớp',
      codeHint:
        'Chữ in hoa không dấu, số và dấu "-" hoặc "_" ở giữa, vd. N5-2026-01.',
      name: 'Tên lớp',
      namePlaceholder: 'VD: N5 tối thứ 2–4',
      description: 'Mô tả',
      startDate: 'Ngày bắt đầu',
      plannedSessions: 'Số buổi',
      plannedSessionsHint: (count: number | null) =>
        count === null
          ? 'Khoá học chưa có số buổi dự kiến, hãy nhập số buổi.'
          : `Bỏ trống = ${count} buổi (số buổi dự kiến của khoá học).`,
      maxStudents: 'Sĩ số tối đa',
      maxStudentsHint:
        'Bỏ trống = không giới hạn. Đủ sĩ số thì không thêm được học viên.',
      location: 'Phòng học / link online',
      scheduleFieldsHint: 'Ngày bắt đầu và số buổi sửa ở tab "Thời khoá biểu".',
      create: 'Tạo lớp',
      save: 'Lưu',
    },
    members: {
      teachersTitle: 'Giáo viên',
      teachersHint:
        'Thành viên có vai trò Giáo viên. Mọi giáo viên của lớp có quyền như nhau: xem lớp, sửa giáo trình lớp.',
      studentsTitle: 'Học viên',
      studentsHint:
        'Thành viên có vai trò Học viên. Xoá khỏi lớp thì bài làm vẫn giữ; thêm lại thì khôi phục.',
      addTeachers: 'Thêm giáo viên',
      addStudents: 'Thêm học viên',
      noTeachers: 'Chưa có giáo viên.',
      noStudents: 'Chưa có học viên.',
      removeTeacher: 'Bỏ khỏi lớp',
      removeStudent: 'Xoá khỏi lớp',
      removeTeacherConfirm: (name: string) =>
        `Bỏ ${name} khỏi danh sách giáo viên của lớp?`,
      removeStudentConfirm: (name: string) =>
        `Xoá ${name} khỏi lớp? Bài làm và kết quả trong lớp vẫn được giữ; thêm lại thì khôi phục.`,
      removed: 'Đã rời lớp',
      removedAt: (date: string) => `Rời lớp ${date}`,
      addedAt: (date: string) => `Vào lớp ${date}`,
      inactive: 'Đã ngừng',
      otherClasses: (codes: string) => `Đang học lớp khác cùng khoá: ${codes}`,
      capacity: (count: number, max: number | null) =>
        max === null
          ? `${count} học viên (không giới hạn sĩ số)`
          : `${count}/${max} học viên`,
      showRemoved: (count: number) => `Học viên đã rời lớp (${count})`,
      pickerTitleTeachers: 'Thêm giáo viên vào lớp',
      pickerTitleStudents: 'Thêm học viên vào lớp',
      pickerHint:
        'Chỉ hiện thành viên đang hoạt động có đúng vai trò. Chọn nhiều người rồi bấm Thêm.',
      pickerSearch: 'Tìm theo họ tên hoặc email',
      pickerEmpty: 'Không có thành viên phù hợp.',
      inClass: 'Đã trong lớp',
      addSelected: (count: number) => `Thêm ${count} người`,
      added: (count: number) => `Đã thêm ${count} người.`,
      removedDone: (name: string) => `Đã bỏ ${name} khỏi lớp.`,
      room: (room: number) => `Còn ${room} chỗ`,
      conflictsTitle: 'Trùng lịch (vẫn thêm được)',
      conflictLine: (name: string, count: number) =>
        `${name}: ${count} buổi của lớp này trùng giờ với lớp khác`,
    },
    curriculum: {
      hint: 'Giáo trình riêng của lớp: giáo viên của lớp và Owner/Admin thêm bài học/đề thi đã publish, sắp xếp, đặt ngày mở, deadline. Không ảnh hưởng giáo trình tham khảo.',
      readOnly: 'Chỉ xem: lớp đã kết thúc hoặc đã huỷ.',
      save: 'Lưu giáo trình lớp',
      saved: 'Đã lưu giáo trình lớp.',
      leaveConfirm: 'Giáo trình lớp có thay đổi chưa lưu. Rời trang?',
      importFrom: 'Nhập từ giáo trình',
      importTitle: 'Nhập từ giáo trình tham khảo',
      importHint:
        'Chép chương và mục của giáo trình vào bản đang sửa (bỏ qua bài/đề đã có trong lớp hoặc chưa publish). Xem lại rồi bấm Lưu.',
      importCourseGroup: 'Giáo trình của khoá học',
      importOtherGroup: 'Giáo trình khác',
      importPlaceholder: 'Chọn giáo trình',
      importButton: 'Nhập',
      imported: (added: number, skipped: number) =>
        skipped > 0
          ? `Đã nhập ${added} mục (bỏ qua ${skipped} mục đã có hoặc chưa publish). Bấm Lưu để ghi lại.`
          : `Đã nhập ${added} mục. Bấm Lưu để ghi lại.`,
      details: 'Ngày mở, deadline & ghi chú',
      opensAt: 'Ngày mở',
      opensAtHint:
        'Trước lúc này học viên thấy mục nhưng chưa vào được. Bỏ trống = mở ngay.',
      groupOpensAt: 'Mở chương lúc',
      deadlineAt: 'Deadline',
      deadlineLessonHint: 'Bài học: deadline chỉ để nhắc.',
      deadlineExamHint:
        'Đề thi: hạn bắt đầu làm; bắt đầu trước hạn thì được làm hết giờ.',
      acceptLate: 'Nhận bài quá hạn',
      acceptLateHint: 'Tắt thì sau deadline học viên không bắt đầu được nữa.',
      passThreshold: 'Ngưỡng đậu (%)',
      retakeOf: 'Thi lại cho',
      notRetake: 'Không phải lần thi lại',
      retakeHint:
        'Lần thi lại của một mục đề thi đứng trước. Nhóm thi = mục gốc + các lần thi lại; chỉ cần đậu một lần.',
      sameExamWarning:
        'Cùng đề với mục gốc: học viên đã làm đề này ở lần trước.',
      retakeBadge: (title: string) => `Thi lại cho: ${title}`,
      addRetake: 'Thêm lần thi lại (cùng đề)',
      hasRetakes:
        'Mục này đang có lần thi lại gắn vào. Hãy bỏ hoặc đổi "Thi lại cho" của các lần thi lại trước.',
      opensBadge: (date: string) => `Mở ${date}`,
      deadlineBadge: (date: string) => `Hạn ${date}`,
      noLate: 'Không nhận quá hạn',
      passBadge: (value: number) => `Đậu ≥ ${value}%`,
      learners: (count: number) => `${count} học viên đã làm`,
      removeWithWork: (count: number) =>
        `Đã có ${count} học viên làm mục này. Xoá sẽ ẩn mục với học viên, bài làm vẫn giữ và không tính vào thống kê. Khôi phục được ở "Mục đã xoá".`,
      removedTitle: (count: number) => `Mục đã xoá (${count})`,
      removedHint:
        'Mục đã có bài làm nên chỉ ẩn khỏi học viên. Khôi phục để hiện lại (thêm vào "Chưa xếp chương").',
      restore: 'Khôi phục',
      pendingHide: 'Sẽ ẩn khi lưu',
    },
    logs: {
      empty: 'Chưa có thay đổi nào.',
      system: 'Hệ thống',
      created: (curriculum: string | null) =>
        curriculum
          ? `Tạo lớp, chép giáo trình ${curriculum}`
          : 'Tạo lớp (không chép giáo trình)',
      updated: (fields: string) => `Sửa thông tin lớp: ${fields}`,
      statusChanged: (from: string, to: string) =>
        `Đổi trạng thái: ${from} → ${to}`,
      finalized: (count: number) => `chốt ${count} lượt thi đang làm dở`,
      teachersAdded: (names: string) => `Thêm giáo viên: ${names}`,
      teacherRemoved: (names: string) => `Bỏ giáo viên: ${names}`,
      studentsAdded: (names: string) => `Thêm học viên: ${names}`,
      studentRemoved: (names: string) => `Xoá học viên khỏi lớp: ${names}`,
      curriculumSaved: 'Lưu giáo trình lớp',
      added: 'Thêm',
      removed: 'Xoá',
      hidden: 'Ẩn (đã có bài làm)',
      restored: 'Khôi phục',
      changed: 'Sửa',
      groupsAdded: 'Thêm chương',
      groupsRemoved: 'Xoá chương',
      groupsChanged: 'Sửa chương',
      reordered: 'Sắp xếp lại thứ tự',
      noChange: 'Không có thay đổi nội dung',
      scheduleSaved: 'Sửa thời khoá biểu',
      scheduleRecomputed: (holiday: string, action: string) =>
        `Lịch tự tính lại vì ${action} ngày nghỉ "${holiday}"`,
      holidayActions: {
        created: 'thêm',
        updated: 'sửa',
        removed: 'xoá',
      } as Record<string, string>,
      scheduleFields: {
        startDate: 'ngày bắt đầu',
        plannedSessions: 'số buổi',
        applyTenantHolidays: 'áp dụng ngày nghỉ',
        slots: 'lịch lặp',
      } as Record<string, string>,
      scheduleChanged: 'Đổi',
      moved: (count: number) => `${count} buổi dời ngày`,
      createdSessions: (count: number) => `thêm ${count} buổi`,
      removedSessions: (count: number) => `xoá ${count} buổi cuối`,
      endDateChange: (from: string, to: string) =>
        `Ngày kết thúc: ${from} → ${to}`,
      sessionUpdated: (session: string, fields: string) =>
        `Sửa ${session}: ${fields}`,
      sessionCancelled: (session: string) => `Huỷ ${session}`,
      sessionRestored: (session: string) => `Khôi phục ${session}`,
      makeupAdded: (session: string, target: number | null) =>
        target === null
          ? `Thêm ${session}`
          : `Thêm ${session} (bù cho Buổi ${target})`,
      makeupRemoved: (session: string) => `Xoá ${session}`,
      linksSaved: (session: string) => `Sửa nội dung ${session}`,
      reason: (reason: string) => `Lý do: ${reason}`,
      sessionFields: {
        location: 'phòng/link',
        note: 'ghi chú',
        time: 'giờ học',
        teachers: 'giáo viên',
        movedWarning: 'đã kiểm tra sau khi dời',
      },
      fields: {
        code: 'mã lớp',
        name: 'tên lớp',
        description: 'mô tả',
        startDate: 'ngày bắt đầu',
        plannedSessions: 'số buổi',
        maxStudents: 'sĩ số tối đa',
        location: 'phòng học/link',
      } as Record<string, string>,
      itemFields: {
        title: 'tên hiển thị',
        label: 'nhãn',
        note: 'ghi chú',
        opensAt: 'ngày mở',
        deadlineAt: 'deadline',
        acceptLate: 'nhận bài quá hạn',
        passThreshold: 'ngưỡng đậu',
        retakeOf: 'thi lại cho',
        group: 'chương',
      },
    },
  },
  schedule: {
    weekdays: [
      '',
      'Thứ 2',
      'Thứ 3',
      'Thứ 4',
      'Thứ 5',
      'Thứ 6',
      'Thứ 7',
      'Chủ nhật',
    ],
    weekdaysShort: ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    sessionLabel: (seq: number | null) =>
      seq === null ? 'Buổi bù' : `Buổi ${seq}`,
    views: { week: 'Tuần', month: 'Tháng', list: 'Danh sách' },
    today: 'Hôm nay',
    previous: 'Trước',
    next: 'Sau',
    weekTitle: (from: string, to: string) => `${from} – ${to}`,
    monthTitle: (month: number, year: number) => `Tháng ${month}/${year}`,
    more: (count: number) => `+${count} buổi`,
    empty: 'Không có buổi học nào trong khoảng này.',
    holiday: 'Nghỉ',
    cancelled: 'Đã huỷ',
    past: 'Đã diễn ra',
    makeup: 'Buổi bù',
    conflict: 'Trùng lịch',
    moved: 'Đã dời – kiểm tra lại',
    substitute: 'Dạy thế',
    timeOverridden: 'Giờ sửa tay',
    customTeachers: 'Giáo viên riêng của buổi',
    classTeachers: 'Theo giáo viên của lớp',
    noTeacher: 'Chưa có giáo viên',
    noLocation: 'Chưa có phòng/link',
    // Tab Thời khoá biểu của lớp
    tabHint:
      'Buổi thứ N rơi vào ô lặp thứ N, bỏ qua ngày nghỉ của trung tâm. Thêm/xoá ngày nghỉ hoặc sửa lịch lặp thì các buổi chưa diễn ra tự dời; nội dung, ghi chú, phòng, giáo viên đi theo buổi.',
    recurring: 'Lịch lặp',
    recurringHint:
      'Owner/Admin sửa ngày bắt đầu, số buổi và các buổi trong tuần. Buổi đã diễn ra, buổi bù không bị dời.',
    noSlots:
      'Chưa có lịch lặp. Owner/Admin thêm các buổi trong tuần để sinh buổi học.',
    startDate: 'Ngày bắt đầu',
    plannedSessions: 'Tổng số buổi',
    endDate: 'Ngày kết thúc (tự tính)',
    applyHolidays: 'Áp dụng ngày nghỉ của trung tâm',
    applyHolidaysHint:
      'Tắt cho lớp vẫn học ngày lễ (lớp online, cấp tốc). Ngày nghỉ quản lý ở trang Cài đặt.',
    applyHolidaysOn: 'Có',
    applyHolidaysOff: 'Không (học cả ngày nghỉ)',
    slots: 'Các buổi trong tuần',
    slotWeekday: 'Thứ',
    slotStart: 'Bắt đầu',
    slotEnd: 'Kết thúc',
    addSlot: 'Thêm buổi trong tuần',
    removeSlot: 'Bỏ buổi này',
    editRecurring: 'Sửa lịch lặp',
    previewSave: 'Xem trước & lưu',
    heldHint: (count: number) =>
      count > 0 ? `Lớp đã học ${count} buổi: các buổi này giữ nguyên.` : '',
    previewTitle: 'Xác nhận thay đổi thời khoá biểu',
    previewNoChange: 'Không có buổi nào thay đổi ngày giờ.',
    previewCreated: (count: number) => `Thêm ${count} buổi mới.`,
    previewMoved: (count: number) => `${count} buổi đổi ngày giờ:`,
    previewRemoved: (count: number) => `Xoá ${count} buổi cuối:`,
    previewRemovedLinks: (count: number) =>
      `có ${count} nội dung đã map sẽ bị bỏ`,
    previewWarning:
      'Buổi có giáo viên dạy thế hoặc giờ sửa tay bị dời: giờ sửa tay bị bỏ, hãy kiểm tra lại giáo viên.',
    previewEndDate: (from: string, to: string) =>
      `Ngày kết thúc: ${from} → ${to}`,
    saved: 'Đã lưu thời khoá biểu.',
    sessionsTitle: 'Buổi học',
    sessionsHint:
      'Giáo viên của lớp và Owner/Admin huỷ/khôi phục buổi, thêm buổi bù, đổi phòng/giờ/giáo viên và map nội dung. Bấm vào buổi để xem chi tiết.',
    addMakeup: 'Thêm buổi bù',
    noSessions: 'Chưa có buổi học nào.',
    columns: {
      session: 'Buổi',
      time: 'Ngày giờ',
      teachers: 'Giáo viên',
      location: 'Phòng/link',
      content: 'Nội dung',
    },
    showList: 'Danh sách',
    showCalendar: 'Lịch',
    // Chi tiết buổi
    backToClass: 'Về lớp học',
    backToSchedule: 'Về lịch',
    detailTitle: (label: string, className: string) =>
      `${label} · ${className}`,
    course: 'Khoá học',
    classroom: 'Lớp',
    time: 'Thời gian',
    location: 'Phòng/link',
    locationInherited: (value: string) => `${value} (theo lớp)`,
    teachers: 'Giáo viên',
    note: 'Ghi chú',
    makeupFor: 'Bù cho',
    content: 'Nội dung buổi',
    noContent: 'Chưa map nội dung nào.',
    students: 'Học viên',
    noStudents: 'Lớp chưa có học viên.',
    substituteHint:
      'Bạn dạy thế buổi này: chỉ xem được chi tiết buổi, không vào được trang lớp.',
    cancelledNotice: (reason: string | null) =>
      reason ? `Buổi đã huỷ. Lý do: ${reason}` : 'Buổi đã huỷ.',
    cancelledContent:
      'Buổi đã huỷ – hãy chuyển nội dung sang buổi khác (buổi bù hoặc buổi sau).',
    movedNotice:
      'Buổi vừa bị dời sang ngày khác. Kiểm tra lại giáo viên dạy thế/giờ học rồi bấm "Đã kiểm tra".',
    movedDismiss: 'Đã kiểm tra',
    conflictsTitle: 'Trùng lịch (cảnh báo, không chặn)',
    conflictLine: (
      className: string,
      session: string,
      time: string,
      people: string,
    ) => `${className} · ${session} (${time}): ${people}`,
    actions: {
      edit: 'Sửa buổi',
      cancel: 'Huỷ buổi',
      restore: 'Khôi phục buổi',
      deleteMakeup: 'Xoá buổi bù',
      links: 'Chọn nội dung',
    },
    pastHint: 'Buổi đã diễn ra: chỉ sửa được phòng/link, ghi chú và nội dung.',
    cancelTitle: 'Huỷ buổi học',
    cancelMessage: (label: string) =>
      `Huỷ ${label}? Buổi giữ số, các buổi sau không dời. Dạy bù bằng cách thêm buổi bù.`,
    cancelReason: 'Lý do (tuỳ chọn)',
    restoreConfirm: (label: string) => `Khôi phục ${label}?`,
    deleteMakeupConfirm:
      'Xoá buổi bù này? Nội dung đã map với buổi cũng bị bỏ.',
    done: 'Đã lưu.',
    editTitle: 'Sửa buổi học',
    date: 'Ngày',
    startTime: 'Giờ bắt đầu',
    endTime: 'Giờ kết thúc',
    regularTimeHint:
      'Buổi thường chỉ đổi giờ trong ngày. Đổi ngày thì sửa thời khoá biểu, hoặc huỷ buổi và thêm buổi bù.',
    teacherMode: 'Giáo viên của buổi',
    teacherModeClass: 'Mọi giáo viên của lớp',
    teacherModeCustom: 'Chọn giáo viên (dạy thế)',
    teacherPickerHint:
      'Thành viên có vai trò Giáo viên, kể cả người ngoài lớp.',
    locationPlaceholder: 'Bỏ trống = theo phòng/link của lớp',
    makeupTitle: 'Thêm buổi bù',
    makeupHint:
      'Buổi bù có ngày cố định, không bị dời khi đổi lịch hay ngày nghỉ. Giáo viên mặc định là giáo viên của lớp.',
    makeupForPlaceholder: 'Không bù cho buổi cụ thể',
    linksTitle: 'Nội dung buổi học',
    linksHint:
      'Chọn chương hoặc mục của giáo trình lớp học ở buổi này (chỉ để tham khảo). Một mục có thể học ở nhiều buổi.',
    ungrouped: 'Chưa xếp chương',
    wholeGroup: 'Cả chương',
    // Trang lịch
    pageTitle: 'Lịch',
    mine: 'Lịch dạy của tôi',
    center: 'Lịch trung tâm',
    mineHint:
      'Các buổi bạn dạy: lớp bạn phụ trách (trừ buổi đã xếp giáo viên khác) và buổi bạn được xếp dạy thế.',
    centerHint:
      'Mọi buổi học của các lớp chưa huỷ trong trung tâm. Viền đỏ = trùng lịch giáo viên/học viên.',
    allCourses: 'Mọi khoá học',
    allTeachers: 'Mọi giáo viên',
    courseTabHint:
      'Buổi học của các lớp thuộc khoá học (mỗi lớp một màu). Teacher chỉ thấy lớp mình phụ trách.',
  },
  tenantSettings: {
    title: 'Cài đặt',
    subtitle:
      'Cài đặt chung của trung tâm (Owner/Admin): tham số chuyên cần và ngày nghỉ.',
    attendanceTitle: 'Tham số chuyên cần',
    attendanceHint:
      'Dùng khi tính tỉ lệ chuyên cần của học viên (bài kiểm tra/bài thi có deadline). Lớp có thể ghi đè.',
    lateWeight: 'Hệ số nộp muộn (k)',
    lateWeightHint:
      'Nộp đúng hạn tính 1, nộp muộn tính k, quá hạn chưa làm tính 0.',
    warningThreshold: 'Ngưỡng cảnh báo (%)',
    warningThresholdHint:
      'Học viên có tỉ lệ chuyên cần dưới ngưỡng này hiện cảnh báo.',
    save: 'Lưu tham số',
    saved: 'Đã lưu tham số chuyên cần.',
    holidaysTitle: 'Ngày nghỉ',
    holidaysHint:
      'Buổi học rơi vào ngày nghỉ tự dời sang ô lịch kế tiếp (các buổi sau lùi theo, ngày kết thúc lớp lùi). Xoá/sửa ngày nghỉ thì lịch tự tính lại. Không lặp hằng năm: mỗi năm nhập lại. Lớp tắt "Áp dụng ngày nghỉ" không bị ảnh hưởng.',
    addHoliday: 'Thêm ngày nghỉ',
    editHoliday: 'Sửa ngày nghỉ',
    noHolidays: 'Chưa có ngày nghỉ nào.',
    holidayName: 'Tên ngày nghỉ',
    holidayNamePlaceholder: 'VD: Tết Nguyên đán',
    from: 'Từ ngày',
    to: 'Đến ngày',
    days: (count: number) => `${count} ngày`,
    impactTitle: 'Lớp bị ảnh hưởng',
    impactNone: 'Không lớp nào bị dời buổi.',
    impactLine: (code: string, moved: number) => `${code}: ${moved} buổi dời`,
    impactEnd: (from: string, to: string) => `kết thúc ${from} → ${to}`,
    impactNotify:
      'Buổi đã diễn ra, buổi bù và lớp đã kết thúc/huỷ không bị dời.',
    checkImpact: 'Tiếp tục',
    confirmSave: 'Lưu và dời lịch',
    deleteTitle: 'Xoá ngày nghỉ',
    deleteMessage: (name: string) => `Xoá ngày nghỉ "${name}"?`,
    holidaySaved: 'Đã lưu ngày nghỉ, lịch các lớp đã được tính lại.',
    holidayDeleted: 'Đã xoá ngày nghỉ, lịch các lớp đã được tính lại.',
  },
  examEditor: {
    backToList: 'Về danh sách đề',
    version: (version: number) => `Version ${version}`,
    readOnlyBadge: 'Chỉ xem',
    readOnlyHint:
      'Bạn chỉ xem được đề này (Teacher chỉ sửa đề do mình tạo). Vẫn xem trước và xem các version được.',
    summary: (sections: number, minutes: number) =>
      `${sections} section · ${minutes} phút`,
    saving: 'Đang lưu…',
    unsaved: 'Có thay đổi chưa lưu (đã giữ bản nháp trên trình duyệt)',
    savedAt: (time: string) => `Đã lưu lúc ${time}`,
    previewButton: 'Xem trước',
    versions: 'Version',
    metadata: 'Thông tin đề',
    save: 'Lưu',
    saveShortcut: 'Lưu tất cả section (Ctrl+S)',
    saveFailed: 'Lưu thất bại',
    saveBeforePublish: 'Hãy lưu thay đổi trước khi publish',
    published: 'Đã publish đề.',
    archived: 'Đã lưu trữ đề.',
    newVersionTitle: 'Tạo version mới',
    newVersionConfirm: (version: number) =>
      `Version hiện tại đã có bài làm nên lần lưu này sẽ tạo version ${version}. Bài làm cũ giữ nguyên nội dung version cũ. Tiếp tục?`,
    newVersionSaved: (version: number) => `Đã lưu thành version ${version}.`,
    issueLine: (section: string, message: string) => `${section}: ${message}`,
    placeholder: 'Nhập nội dung section… (gõ / để chèn nhanh)',
    contentLabel: 'Nội dung section',
    stats: (words: number, chars: number) => `${words} từ · ${chars} ký tự`,
    shortcuts:
      'Ctrl+S: lưu · Ctrl+Shift+B: đánh dấu blank · bấm badge Question để đổi dạng',
    importInvalid: 'File JSON không đúng định dạng nội dung đề.',
    changeQuestionType: (label: string) => `${label} — bấm để đổi dạng`,
    correctAnswer: 'Đáp án đúng',
    restoreDraft: {
      title: 'Khôi phục bản chưa lưu',
      message: (time: string) =>
        `Trình duyệt này còn bản sửa lúc ${time} chưa lưu lên server. Khôi phục bản đó?`,
      staleNote:
        'Đề đã được lưu ở nơi khác sau khi bạn bắt đầu sửa; khôi phục rồi lưu sẽ ghi đè lần lưu đó.',
      confirm: 'Khôi phục',
      discard: 'Dùng bản trên server',
    },
    tabs: {
      label: 'Section',
      minutes: (minutes: number) => `${minutes} phút`,
      errors: (count: number) => `${count} lỗi soạn thảo`,
      duration: 'Thời lượng section',
      rename: 'Đổi tên section',
      name: 'Tên section',
      nameHint: (max: number) => `Tối đa ${max} ký tự.`,
      remove: 'Xoá section',
      cannotRemove: 'Đề phải có ít nhất 1 section',
      removeConfirm: (name: string) =>
        `Xoá section ${name} cùng toàn bộ nội dung? Có thể hoàn tác bằng cách không lưu và tải lại trang.`,
      add: 'Thêm section',
      addEmpty: 'Section trống',
      fromModule: 'Từ module của loại đề',
      maxSections: (max: number) => `Tối đa ${max} section`,
      defaultName: (index: number) => `Section ${index}`,
    },
    toolbar: {
      blockType: 'Kiểu đoạn',
      blockTypes: {
        p: 'Văn bản',
        h1: 'Tiêu đề 1',
        h2: 'Tiêu đề 2',
        h3: 'Tiêu đề 3',
        h4: 'Tiêu đề 4',
        h5: 'Tiêu đề 5',
        h6: 'Tiêu đề 6',
        blockquote: 'Trích dẫn',
        code_block: 'Khối mã',
      },
      fontSize: 'Cỡ chữ',
      bold: 'Đậm',
      italic: 'Nghiêng',
      underline: 'Gạch chân',
      strikethrough: 'Gạch ngang',
      code: 'Mã inline',
      highlight: 'Đánh dấu',
      superscript: 'Chỉ số trên',
      subscript: 'Chỉ số dưới',
      textColor: 'Màu chữ',
      backgroundColor: 'Màu nền chữ',
      removeColor: 'Bỏ màu',
      clearFormat: 'Xoá định dạng',
      bulletList: 'Danh sách chấm',
      numberedList: 'Danh sách số',
      todoList: 'Danh sách checkbox',
      orderingList: 'Danh sách đánh số tay — Ordering / Polytomous',
      pair: 'Cặp ghép — Matching / True-False / Yes-No',
      indent: 'Thụt vào',
      outdent: 'Thụt ra',
      alignLeft: 'Canh trái',
      alignCenter: 'Canh giữa',
      alignRight: 'Canh phải',
      alignJustify: 'Canh đều',
      link: 'Chèn liên kết',
      insert: 'Chèn',
      divider: 'Đường kẻ ngang',
      image: 'Hình ảnh',
      audio: 'Audio',
      video: 'Video',
      table: 'Bảng',
      insertTable: 'Chèn bảng 3×3',
      addRow: 'Thêm dòng',
      addColumn: 'Thêm cột',
      deleteRow: 'Xoá dòng',
      deleteColumn: 'Xoá cột',
      deleteTable: 'Xoá bảng',
      blank: 'Blank — ô trống (Ctrl+Shift+B)',
      indicator: 'Chèn indicator',
      undo: 'Hoàn tác',
      redo: 'Làm lại',
      exportJson: 'Xuất JSON của section',
      importJson: 'Nhập JSON vào section (thay nội dung hiện tại)',
    },
    slash: {
      ordering: 'Danh sách đánh số tay',
      pair: 'Cặp ghép',
      table: 'Bảng 3×3',
    },
    rich: {
      callout: 'Callout — Lưu ý / Ví dụ / Mẹo',
      callouts: { note: 'Lưu ý', example: 'Ví dụ', tip: 'Mẹo' },
      calloutVariant: 'Loại callout',
      toggle: 'Khối gập/mở',
      toggleHint:
        'Khối gập/mở: các dòng thụt vào bên dưới là nội dung, người học bấm tiêu đề để mở',
      ruby: 'Furigana — bôi đen chữ rồi nhập cách đọc',
      rubyTitle: 'Furigana',
      rubyLabel: 'Cách đọc',
      rubySave: 'Lưu',
      rubyHint: 'Để trống rồi lưu để gỡ furigana.',
      rubyNeedSelection: 'Bôi đen chữ cần gắn furigana trước.',
    },
    pair: {
      answer: 'Đáp án',
      chooseAnswer: '— chọn đáp án —',
      staleAnswer: (answer: string) => `${answer} (không có trong danh sách)`,
    },
    numberPopover: {
      title: { ordering: 'Thứ tự đúng', polytomous: 'Trọng số điểm' },
      markerTitle: {
        ordering: 'Thứ tự đúng — bấm để nhập',
        polytomous: 'Trọng số điểm — bấm để nhập',
      },
      hint: {
        ordering:
          'Vị trí đúng, bắt đầu từ 1 và không trùng trong cùng danh sách.',
        polytomous:
          'Trọng số điểm, số nguyên từ 0. Nhiều dòng được trùng trọng số.',
      },
      invalid: (min: number) => `Nhập số nguyên từ ${min} trở lên.`,
      taken: (value: number) =>
        `Số ${value} đã dùng ở dòng khác trong danh sách này.`,
      clear: 'Xoá số',
      save: 'Lưu',
    },
    issues: {
      title: (errors: number) => `Kiểm tra · ${errors} lỗi`,
      none: 'Không có lỗi nào. Mọi câu hỏi đã đủ dạng và đáp án.',
      section: 'Section',
      warning: 'cảnh báo',
    },
    minimap: {
      title: (count: number) => `Mini map · ${count} indicator`,
      empty:
        'Chưa có indicator nào. Dùng nút Indicator trên thanh công cụ (hoặc gõ /) để chèn.',
    },
    indicatorDialog: {
      title: 'Dạng câu hỏi',
      save: 'Lưu',
      params: {
        seconds: { label: 'Thời gian nói', unit: 'giây' },
        maxChars: { label: 'Giới hạn bài viết', unit: 'ký tự' },
        maxPicks: { label: 'Số đáp án cần chọn', unit: 'đáp án' },
      },
      numberHint: (min: number, max: number, unit: string) =>
        `Nhập số nguyên từ ${min} đến ${max} ${unit}.`,
      options: (count: number) => `Danh sách option (${count})`,
      optionsHint:
        'Mỗi dòng một option, gồm cả đáp án nhiễu. Cần ít nhất 2 option.',
      duplicatedOptions: 'Có option bị trùng.',
    },
    explanationDialog: {
      title: 'Chèn Explanation (giải thích)',
      intro:
        'Explanation là phần giải thích đáp án. Học viên không thấy nội dung này khi làm bài.',
      rules: [
        'Đặt Explanation ngay sau nội dung câu hỏi (sau danh sách lựa chọn, cặp ghép, ô trống…). Nó gắn với Question ngay phía trên.',
        'Nếu giữa câu hỏi và Explanation có Part/Subpart, hoặc phía trên không có Question nào, thì Explanation không gắn câu nào.',
        'Nội dung giải thích là mọi dòng bên dưới indicator cho tới indicator kế tiếp. Muốn viết nội dung khác sau đó, hãy chèn indicator mới (Part, Subpart hoặc Question).',
        'Một câu hỏi có thể có nhiều Explanation. Giải thích không tính vào số câu và không được chấm điểm.',
        'Khi nào hiện: bài học hiện sau khi học viên nộp phần; đề thi không bao giờ hiện cho học viên, chỉ người chấm thấy; Xem trước hiện sau khi bấm Nộp.',
      ],
      target: 'Tại vị trí con trỏ, Explanation sẽ gắn với:',
      targetNumbers: (first: number, last: number) =>
        first === last ? `Câu ${first}` : `Câu ${first}–${last}`,
      targetNone: 'Không gắn câu nào',
      insert: 'Chèn',
    },
    preview: {
      title: 'Giả lập bài làm',
      sections: 'Chọn section',
      sectionLabel: (index: number, name: string, minutes?: number) =>
        minutes === undefined
          ? `${index}. ${name}`
          : `${index}. ${name} · ${minutes} phút`,
      aside:
        'Đáp án soạn trong editor được ẩn · câu trả lời ở đây không được lưu',
    },
  },
  // Nút "Định dạng bằng AI" trong trình soạn đề (req-5 Step 4).
  aiFormat: {
    button: 'Định dạng bằng AI',
    notConfigured: 'Chưa cấu hình AI',
    title: 'Định dạng bằng AI',
    sectionLabel: (name: string) => `Section: ${name}`,
    replaceWarning:
      'AI sẽ dựng Part, Subpart, câu hỏi và đáp án cho section đang mở. Nội dung section sẽ được thay bằng kết quả (chưa lưu – bấm Ctrl+Z để quay lại bản trước).',
    note: 'Ghi chú cho AI',
    notePlaceholder:
      'Ví dụ: đáp án nằm ở bảng cuối đề; câu 1–5 là True/False/Not Given…',
    used: (used: number, limit: number | null) =>
      limit === null
        ? `Đã dùng ${used.toLocaleString('vi-VN')} lượt tháng này`
        : `Đã dùng ${used.toLocaleString('vi-VN')}/${limit.toLocaleString('vi-VN')} lượt tháng này`,
    quotaHint:
      'Mỗi lần bấm "Định dạng" tính 1 lượt vào hạn mức của trung tâm, kể cả khi kết quả còn lỗi.',
    start: 'Định dạng',
    running: (attempt: number, max: number) => `Lần thử ${attempt}/${max}…`,
    runningHint:
      'AI đang đọc nội dung và dựng câu hỏi. Có thể mất tới vài phút với section dài.',
    cancelling: 'Đang huỷ…',
    statusFailed: 'Không tải được trạng thái AI',
    startFailed: 'Không bắt đầu được định dạng bằng AI',
    interrupted: 'Phiên định dạng đã bị gián đoạn, vui lòng thử lại',
    failed: 'Định dạng bằng AI thất bại, vui lòng thử lại',
    invalidResult: 'Kết quả AI trả về không hợp lệ, nội dung được giữ nguyên',
    succeeded:
      'Đã định dạng bằng AI. Kiểm tra lại rồi bấm Lưu (Ctrl+Z để quay lại bản trước).',
    partial: (errors: number) =>
      `AI đã định dạng nhưng còn ${errors} lỗi cấu trúc sau các lần thử – nên chỉnh tay theo bảng kiểm tra rồi mới Lưu (Ctrl+Z để quay lại bản trước).`,
    unchanged:
      'AI không định dạng được section này, nội dung được giữ nguyên. Thử thêm ghi chú cho AI hoặc chia nhỏ section.',
    alreadyFormatted:
      'Section đã được định dạng, AI không thay đổi gì. Thêm ghi chú cho AI nếu muốn chỉnh phần cụ thể.',
    cancelled: 'Đã huỷ định dạng bằng AI, nội dung không đổi.',
    dismiss: 'Ẩn thông báo',
  },
  // Khu vực chính: đề đang mở, lịch sử lượt làm, kết quả (Step 13).
  classLearning: {
    heading: 'Lớp của tôi',
    noClasses: 'Bạn chưa được xếp vào lớp nào.',
    myScheduleLink: 'Lịch học của tôi',
    scheduleHeading: 'Lịch học của tôi',
    scheduleHint:
      'Buổi học của các lớp bạn đang học. Ngày nghỉ của trung tâm tô xám, buổi đã huỷ gạch ngang.',
    backToTenant: 'Về trang trung tâm',
    backToClasses: 'Về danh sách lớp',
    progress: (done: number, total: number) => `Đã xong ${done}/${total} mục`,
    nextSession: 'Buổi kế tiếp',
    upcomingSessions: 'Buổi sắp tới',
    noUpcoming: 'Chưa có buổi học nào sắp tới.',
    teachers: 'Giáo viên',
    studentCount: (value: number) => `${value} học viên`,
    sessionLabel: (seq: number | null) =>
      seq === null ? 'Buổi bù' : `Buổi ${seq}`,
    learnAtSession: (labels: string) => `Học ở ${labels}`,
    curriculumHeading: 'Giáo trình lớp',
    emptyCurriculum: 'Giáo trình lớp chưa có mục nào.',
    ungrouped: 'Chưa xếp chương',
    opensAt: (value: string) => `Mở lúc ${value}`,
    deadlineAt: (value: string) => `Hạn ${value}`,
    deadlineStartHint: 'Hạn bắt đầu làm bài',
    noLate: 'Không nhận bài quá hạn',
    passThreshold: (value: number) => `Đậu ≥ ${value}%`,
    retakeOf: (title: string) => `Thi lại cho: ${title}`,
    attemptIndex: (value: number) => `Lần ${value}`,
    notRequired: 'Không bắt buộc (bạn đã đậu lần trước)',
    required: 'Bắt buộc',
    classNotOpen:
      'Lớp chưa bắt đầu hoặc đã kết thúc, bạn chỉ xem được giáo trình và kết quả.',
    lock: {
      classroom: 'Lớp chưa mở phần này',
      not_open: 'Chưa tới ngày mở',
      deadline: 'Đã quá hạn',
      done: 'Đã làm xong',
      content: 'Nội dung không còn',
    },
    start: {
      lesson: 'Vào học',
      exam: 'Vào làm bài',
    },
    continueLesson: 'Học tiếp',
    reviewLesson: 'Xem lại',
    reviewAttempt: 'Xem kết quả',
    starting: 'Đang mở…',
    completed: 'Đã học xong',
    notStarted: 'Chưa làm',
    state: {
      in_progress: 'Đang làm',
      pending_grading: 'Chờ chấm',
      graded: 'Đã chấm',
    },
    score: (value: number) => `${value}%`,
    passed: 'Đậu',
    failed: 'Chưa đạt',
    // Tổng kết khi lớp đã kết thúc (R11.3, T5.3).
    summary: {
      heading: 'Tổng kết cuối khoá',
      hint: 'Kết quả này chỉ hiện sau khi lớp kết thúc.',
      attendance: 'Tỉ lệ chuyên cần',
      attendanceHint: (onTime: number, late: number, missed: number) =>
        `Đúng hạn ${onTime} · Muộn ${late} · Chưa nộp ${missed}`,
      noAttendance: 'Không có mục nào tính chuyên cần.',
      below: (threshold: number) =>
        `Chuyên cần dưới ngưỡng ${threshold}% của lớp.`,
      marks: {
        on_time: 'Đúng hạn',
        late: 'Muộn',
        missed: 'Chưa nộp',
        in_progress: 'Đang làm',
        pending: 'Chưa tới hạn',
        excluded: 'Không tính',
      },
      averages: 'Trung bình theo chương',
      comment: 'Nhận xét của giáo viên',
      noComment: 'Giáo viên chưa viết nhận xét.',
    },
    groupsHeading: 'Kết quả bài kiểm tra/bài thi',
    groupBest: (value: number) => `Điểm cao nhất ${value}%`,
    groupNoScore: 'Chưa có điểm',
    groupPending: 'còn lượt chờ chấm',
  },
  // Khu vực phụ huynh "Con của tôi" (req-3 Step 13, R19).
  guardian: {
    heading: 'Con của tôi',
    hint: 'Bạn xem được lớp, lịch học và kết quả của con. Nội dung bài học/đề thi và đáp án không hiện ở đây.',
    empty:
      'Bạn chưa được liên kết với học viên nào. Liên hệ trung tâm để được gắn với con.',
    loadError: 'Không tải được thông tin của con',
    notFound: 'Không tìm thấy học viên đã liên kết với bạn.',
    relationship: (value: string) => `Quan hệ: ${value}`,
    inactive: 'Đã ngừng',
    classCount: (value: number) =>
      value === 0 ? 'Chưa có lớp' : `${value} lớp`,
    backToChildren: 'Về danh sách con',
    backToChild: (name: string) => `Về trang của ${name}`,
    classesHeading: 'Lớp của con',
    noClasses: 'Con bạn chưa được xếp vào lớp nào.',
    openClass: 'Xem lớp',
    scheduleHeading: 'Lịch học của con',
    scheduleHint:
      'Buổi học của các lớp con đang học. Ngày nghỉ của trung tâm tô xám, buổi đã huỷ gạch ngang.',
    freeHeading: 'Bài làm ngoài lớp',
    freeExams: 'Bài thi',
    freeLessons: 'Bài học',
    noFree: 'Con bạn chưa làm bài nào ngoài lớp.',
    startedAt: (value: string) => `Bắt đầu ${value}`,
    autoScore: (correct: number, total: number) =>
      `Đúng ${correct}/${total} câu tự chấm`,
    pendingGrading: (value: number) => `Còn ${value} câu chờ chấm`,
    percent: (value: number) => `${value}%`,
    lessonCompleted: 'Đã học xong',
    manualHeading: 'Nhận xét của giáo viên',
    manualRow: (section: string, number: number) =>
      section ? `${section} · Câu ${number}` : `Câu ${number}`,
    manualScore: (score: number | null, max: number) =>
      `${score ?? 0}/${max} điểm`,
    manualNoComment: 'Không có nhận xét',
    classNotOpen: 'Lớp chưa bắt đầu hoặc đã kết thúc, đây chỉ là bản xem lại.',
    notRequired: 'Không bắt buộc (đã đậu lần trước)',
  },
  classAttempts: {
    title: 'Bài làm của học viên',
    open: 'Bài làm',
    empty: 'Chưa có học viên nào làm bài này.',
    student: 'Học viên',
    startedAt: 'Bắt đầu',
    result: 'Kết quả',
    voidedBadge: 'Đã cho làm lại',
    voidAction: 'Cho làm lại',
    voiding: 'Đang xử lý…',
    confirmVoid: (name: string) =>
      `Cho ${name} làm lại bài này? Lượt hiện tại vẫn được giữ trong lịch sử nhưng không tính điểm; nếu đang làm dở thì bị chốt ngay.`,
    voided: 'Đã cho làm lại. Học viên có thể bắt đầu lượt mới.',
    hint: 'Mỗi bài kiểm tra/bài thi chỉ làm một lần. Khi học viên gặp sự cố (mất mạng, máy hỏng), bấm "Cho làm lại" để mở một lượt mới.',
  },
  lessonLearning: {
    heading: 'Bài học',
    searchPlaceholder: 'Tìm bài học',
    allBlueprints: 'Mọi mẫu bài học',
    noLessons: 'Trung tâm chưa có bài học nào mở cho mọi thành viên.',
    noMatch: 'Không có bài học nào khớp bộ lọc.',
    lessonStats: (sections: number, questions: number) =>
      questions > 0
        ? `${sections} phần · ${questions} câu hỏi`
        : `${sections} phần`,
    status: {
      in_progress: 'Đang học',
      completed: 'Đã học xong',
    },
    backToTenant: 'Về trang trung tâm',
    backToLesson: 'Về trang bài học',
    sectionsHeading: 'Nội dung bài học',
    theory: 'Lý thuyết',
    questions: (value: number) => `${value} câu hỏi`,
    start: 'Bắt đầu học',
    continue: 'Học tiếp',
    review: 'Xem lại',
    starting: 'Đang mở bài học…',
    startHint:
      'Học theo từng phần, không giới hạn thời gian. Phần có câu hỏi bấm "Nộp phần này" để xem đáp án và giải thích; làm lại bao nhiêu lần cũng được.',
    completeHint:
      'Bài học được tính là học xong khi bạn đã mở mọi phần và nộp mọi phần có câu hỏi.',
    closed: 'Bài học đã ngừng mở, bạn chỉ xem lại được lượt học cũ.',
    historyHeading: 'Lượt học của tôi',
    noAttempts: 'Bạn chưa học bài này.',
    version: (value: number) => `Phiên bản ${value}`,
    oldVersion: 'Phiên bản cũ · chỉ xem lại',
    progress: (
      viewed: number,
      sections: number,
      submitted: number,
      total: number,
    ) =>
      total > 0
        ? `Đã mở ${viewed}/${sections} phần · đã nộp ${submitted}/${total} phần bài tập`
        : `Đã mở ${viewed}/${sections} phần`,
    autoScore: (correct: number, total: number) =>
      `Đúng ${correct}/${total} câu`,
    manualProgress: (graded: number, total: number) =>
      `Đã chấm ${graded}/${total} câu tự luận`,
    readOnly:
      'Lượt học này chỉ còn xem lại: bài học đã có phiên bản mới hoặc không còn mở.',
    completedBanner: 'Bạn đã học xong bài này. Vẫn có thể làm lại bài tập.',
    submitSection: 'Nộp phần này',
    submitting: 'Đang nộp…',
    confirmSubmit: 'Nộp phần này? Bạn sẽ thấy đáp án và có thể làm lại sau.',
    unanswered: (count: number) => `Còn ${count} câu chưa làm — vẫn nộp?`,
    retry: 'Làm lại',
    retrying: 'Đang mở lại…',
    viewPrevious: 'Xem kết quả lần trước',
    backToDraft: 'Quay lại làm bài',
    previousHint: 'Kết quả lần nộp trước, sẽ được thay khi bạn nộp lần mới.',
    submittedAt: (value: string) => `Nộp lúc ${value}`,
    submitCount: (count: number) => `Đã nộp ${count} lần`,
    resultSummary: (correct: number, total: number) =>
      `Đúng ${correct}/${total} câu`,
    manualPending: (count: number) => `${count} câu chờ giáo viên chấm`,
    manualDone: (graded: number, total: number) =>
      `Đã chấm ${graded}/${total} câu tự luận`,
    noSubmitNeeded: 'Phần này không có câu hỏi, chỉ cần đọc.',
    listenSubmitted: 'Nghe lại bài nói',
    noRecording: 'Không có ghi âm.',
    saveState: {
      saved: 'Đã lưu',
      dirty: 'Chưa lưu',
      saving: 'Đang lưu…',
      error: 'Lưu thất bại, đang thử lại',
    },
    previewTitle: 'Xem trước bài học',
    previewAside: 'Xem trước · chấm ngay trên trình duyệt, không lưu',
  },
  learner: {
    searchPlaceholder: 'Tìm đề thi',
    allCategories: 'Mọi danh mục',
    allBlueprints: 'Mọi loại đề',
    noMatch: 'Không có đề nào khớp bộ lọc.',
    examStats: (sections: number, questions: number, minutes: number) =>
      `${sections} section · ${questions} câu · ${minutes} phút`,
    recentAttempts: 'Lượt làm gần đây',
    viewExam: 'Xem đề',
    backToTenant: 'Về trang trung tâm',
    sectionsHeading: 'Cấu trúc đề',
    sectionColumns: {
      section: 'Section',
      duration: 'Thời gian',
      questions: 'Số câu',
    },
    minutes: (value: number) => `${value} phút`,
    questions: (value: number) => `${value} câu`,
    totalDuration: (value: number) => `Tổng thời gian ${value} phút`,
    start: 'Bắt đầu làm bài',
    continue: 'Làm tiếp',
    starting: 'Đang tạo lượt làm…',
    startHint:
      'Mỗi section có đồng hồ riêng, chỉ bắt đầu tính giờ khi bạn bấm Bắt đầu ở màn hình hướng dẫn của section đó.',
    inProgressHint:
      'Bạn đang có lượt làm dở. Hãy làm tiếp hoặc nộp bài trước khi bắt đầu lượt mới.',
    closed: 'Đề đã ngừng mở, bạn chỉ xem được lịch sử lượt làm.',
    historyHeading: 'Lịch sử lượt làm',
    noAttempts: 'Bạn chưa làm đề này lần nào.',
    attemptColumns: {
      exam: 'Đề thi',
      startedAt: 'Bắt đầu',
      status: 'Trạng thái',
      score: 'Số câu đúng',
      actions: 'Thao tác',
    },
    attemptStatus: {
      in_progress: 'Đang làm',
      submitted: 'Chờ chấm',
      graded: 'Đã có kết quả',
    },
    sectionProgress: (done: number, total: number) =>
      `Đã nộp ${done}/${total} section`,
    score: (correct: number, total: number) => `${correct}/${total}`,
    viewResult: 'Xem kết quả',
    resultTitle: 'Kết quả bài làm',
    startedAt: (value: string) => `Bắt đầu ${value}`,
    submittedAt: (value: string) => `Nộp ${value}`,
    autoTotal: 'Câu chấm tự động đúng',
    manualProgress: (graded: number, total: number) =>
      `Đã chấm ${graded}/${total} câu tự luận`,
    noManual: 'Không có câu chấm tay',
    resultNote:
      'Kết quả chỉ hiện số câu đúng, không hiện đáp án. Câu Writing/Speaking do giáo viên chấm.',
    autoSubmitted: 'Hết giờ, tự nộp',
    manualHeading: 'Phần chấm tay',
    manualItem: (no: number, qtype: string) => `Câu ${no} · ${qtype}`,
    waitingGrade: 'Chờ chấm',
    manualScore: (score: number, max: number) => `${score}/${max} điểm`,
    manualTotal: (score: number, max: number) =>
      `Tổng điểm tự luận ${score}/${max}`,
    qtypes: { writing: 'Writing', speaking: 'Speaking' } as Record<
      string,
      string
    >,
  },
  // Trang thi toàn màn hình.
  examTaking: {
    loadFailed: 'Không tải được bài làm',
    sectionOf: (index: number, total: number) => `Section ${index}/${total}`,
    sectionInfo: (minutes: number, questions: number) =>
      `${minutes} phút · ${questions} câu`,
    startSection: 'Bắt đầu section',
    starting: 'Đang bắt đầu…',
    startHint:
      'Đồng hồ bắt đầu chạy khi bấm Bắt đầu. Hết giờ, bài được tự động nộp. Tải lại trang không làm mất câu trả lời đã lưu.',
    noIntro: 'Section này không có phần hướng dẫn.',
    justSubmitted: (name: string) => `Đã nộp section "${name}".`,
    justAutoSubmitted: (name: string) =>
      `Hết giờ, section "${name}" đã được tự động nộp.`,
    sectionStatus: {
      not_started: 'Chưa làm',
      in_progress: 'Đang làm',
      submitted: 'Đã nộp',
    },
    finish: 'Nộp toàn bài',
    finishTitle: 'Nộp toàn bài?',
    finishMessage: (remaining: number) =>
      `Còn ${remaining} section chưa làm sẽ được tính là bỏ trống. Nộp rồi không làm tiếp được nữa.`,
    timeLeft: 'Thời gian còn lại',
    saveState: {
      saved: 'Đã lưu',
      dirty: 'Chưa lưu',
      saving: 'Đang lưu…',
      error: 'Lưu thất bại, đang thử lại',
    },
    submitting: 'Đang nộp section…',
    timeUp: 'Hết giờ — đang nộp bài…',
    submitFailed: 'Nộp section thất bại',
    finished: 'Bạn đã nộp bài. Đang chuyển tới trang kết quả…',
    exit: 'Thoát',
    recorder: {
      unsupported:
        'Trình duyệt không cho ghi âm trên trang này (cần HTTPS hoặc localhost, và trình duyệt hỗ trợ MediaRecorder).',
      permissionDenied:
        'Không truy cập được micro. Hãy cho phép trình duyệt dùng micro rồi thử lại.',
      record: 'Ghi âm',
      rerecord: 'Ghi lại',
      stop: 'Dừng',
      recording: (elapsed: number, max?: number) =>
        `Đang ghi ${elapsed}s${max !== undefined ? ` / ${max}s` : ''}`,
      limit: (seconds?: number) =>
        seconds !== undefined
          ? `Ghi âm tối đa ${seconds} giây, được ghi lại trong thời gian làm section.`
          : 'Được ghi lại trong thời gian làm section.',
      uploading: 'Đang tải bản ghi lên…',
      uploaded: (time: string) => `Đã lưu bản ghi lúc ${time}`,
      uploadFailed: 'Tải bản ghi lên thất bại',
      play: 'Nghe lại',
      retryUpload: 'Tải lại lên',
    },
  },
  // Bản giả lập đề: xem trước trong dashboard và trang thi.
  grading: {
    subtitle:
      'Chấm các câu Writing/Speaking của bài đã nộp. Bạn thấy bài trong lớp mình phụ trách, bài làm tự do của đề mình soạn và bài được chuyển giao; không chấm được bài của chính mình.',
    lessonSubtitle:
      'Chấm các câu Writing/Speaking trong bài tập của bài học. Chỉ chấm lần nộp gần nhất: học viên nộp lại thì điểm cũ bị bỏ và cần chấm lại.',
    kinds: { exam: 'Đề thi', lesson: 'Bài học' },
    searchPlaceholder: 'Tìm theo tên hoặc email học viên',
    allStatuses: 'Mọi trạng thái',
    allExams: 'Mọi đề thi',
    allLessons: 'Mọi bài học',
    allClasses: 'Mọi lớp và bài tự do',
    freeClass: 'Bài làm tự do',
    allItems: 'Mọi mục của lớp',
    status: { submitted: 'Chờ chấm', graded: 'Đã chấm' },
    columns: {
      student: 'Học viên',
      exam: 'Đề thi',
      lesson: 'Bài học',
      submittedAt: 'Nộp lúc',
      progress: 'Chấm tay',
      status: 'Trạng thái',
      classItem: 'Lớp · Mục',
    },
    freeAttempt: 'Bài làm tự do',
    empty: 'Không có bài nào khớp bộ lọc.',
    open: 'Chấm bài',
    view: 'Xem bài',
    progress: (graded: number, total: number) => `${graded}/${total} câu`,
    autoScore: (correct: number, total: number) =>
      `Tự động đúng ${correct}/${total}`,
    backToList: 'Danh sách bài',
    submittedAt: (value: string) => `Nộp ${value}`,
    questionsHeading: 'Câu cần chấm',
    questionLabel: (no: number, qtype: string) => `Câu ${no} · ${qtype}`,
    partLabel: (section: string, part: number | null) =>
      part === null ? section : `${section} · Part ${part + 1}`,
    autoSubmitted: 'Hết giờ, tự nộp',
    passage: 'Nội dung part',
    prompt: 'Đề bài',
    explanations: 'Giải thích (học viên không thấy)',
    lessonExplanations: 'Giải thích (học viên thấy sau khi nộp)',
    response: 'Bài làm',
    blank: 'Học viên bỏ trống câu này.',
    noRecording: 'Học viên không ghi âm câu này.',
    loadRecording: 'Tải ghi âm',
    recordingFailed: 'Không tải được ghi âm',
    charCount: (chars: number, words: number, max: number | null) =>
      `${chars}${max ? `/${max}` : ''} ký tự · ${words} từ`,
    maxSeconds: (seconds: number) => `Ghi tối đa ${seconds} giây`,
    score: 'Điểm',
    scoreHint: (max: number) => `0–${max}, bước 0,5`,
    comment: 'Nhận xét',
    commentPlaceholder: 'Nhận xét cho học viên (không bắt buộc)',
    save: 'Lưu điểm',
    saveAndNext: 'Lưu & câu tiếp',
    zero: 'Cho 0 điểm',
    saved: 'Đã lưu điểm',
    unsaved: 'Chưa lưu',
    invalidScore: (max: number) => `Điểm phải từ 0 đến ${max}, bước 0,5`,
    waiting: 'Chờ chấm',
    scoreBadge: (score: number, max: number) => `${score}/${max}`,
    gradedBy: (name: string, at: string) => `Chấm bởi ${name} · ${at}`,
    gradedByUnknown: (at: string) => `Đã chấm · ${at}`,
    allGraded: 'Đã chấm đủ mọi câu của bài này. Học viên đã xem được điểm.',
    nextAttempt: 'Bài chờ chấm tiếp theo',
    delegation: {
      open: 'Chuyển giao chấm',
      title: 'Chuyển giao chấm',
      hint: 'Chọn phạm vi rồi chọn giáo viên sẽ chấm thay. Bạn vẫn chấm được sau khi chuyển giao; người được chuyển giao không chuyển giao tiếp cho người khác.',
      scope: 'Phạm vi',
      teachers: 'Giáo viên được chấm',
      pick: 'Chọn giáo viên',
      noTeachers: 'Trung tâm chưa có giáo viên nào khác.',
      add: 'Chuyển giao',
      adding: 'Đang lưu…',
      current: 'Đang chuyển giao',
      none: 'Chưa chuyển giao cho ai.',
      by: (name: string, at: string) => `${name} giao · ${at}`,
      remove: 'Gỡ',
      confirmRemove: (name: string) =>
        `Gỡ quyền chấm của ${name} với phạm vi này?`,
      notAllowed:
        'Chỉ giáo viên của lớp, người soạn đề/bài học hoặc Chủ sở hữu/Quản trị mới chuyển giao được bài này.',
    },
  },
  classStudentAttempts: {
    title: 'Bài làm của học viên',
    open: 'Bài làm',
    back: 'Về lớp học',
    removedStudent: 'Học viên đã rời lớp. Bài làm cũ vẫn xem được.',
    removedItem: 'Mục đã bỏ khỏi giáo trình',
    empty: 'Học viên chưa có mục nào trong giáo trình lớp.',
    noAttempt: 'Chưa làm',
    ungrouped: 'Chưa xếp chương',
    attemptLabel: (index: number) => `Lần ${index}`,
    notRequired: 'Không bắt buộc',
    review: 'Xem bài làm',
    reviewTitle: 'Bài làm chi tiết',
    reviewHint:
      'Câu trả lời của học viên kèm đáp án và đúng/sai từng câu. Chỉ giáo viên của lớp và Chủ sở hữu/Quản trị xem được trang này.',
    notSubmitted: 'Phần này học viên chưa nộp.',
    lessonProgress: (correct: number, total: number) =>
      `Tự động đúng ${correct}/${total}`,
    deadline: (value: string) => `Hạn ${value}`,
    threshold: (value: number) => `Đậu ≥ ${value}%`,
  },
  simulator: {
    status: {
      todo: 'Chưa làm',
      flagged: 'Gắn cờ',
      answered: 'Đã trả lời',
      correct: 'Đúng',
      wrong: 'Sai',
      manual: 'Không chấm tự động',
    },
    badgeResult: (label: string, status: string) => `Câu ${label} — ${status}`,
    badgeFlag: (label: string, flagged: boolean) =>
      `Câu ${label} — bấm để ${flagged ? 'gỡ' : 'gắn'} cờ`,
    correctSummary: (manual: number) =>
      manual > 0 ? `câu đúng · ${manual} câu không chấm tự động` : 'câu đúng',
    reviewHint: 'Bấm số để xem lại từng câu',
    retry: 'Làm lại',
    unanswered: (count: number) => `Còn ${count} câu chưa làm — vẫn nộp?`,
    keepGoing: 'Làm tiếp',
    submitAnyway: 'Vẫn nộp',
    progress: (done: number, total: number) =>
      `Đã trả lời ${done}/${total} · bấm số trong đề để gắn cờ`,
    submit: 'Nộp bài',
    submitSection: 'Nộp section',
    confirmSubmit: 'Nộp section này? Nộp rồi không sửa được nữa.',
    question: (no: number) => `Câu ${no}`,
    questionRange: (first: number, last: number) =>
      first === last ? `Câu ${first}` : `Câu ${first}–${last}`,
    blank: 'Ô trống',
    choice: 'Lựa chọn',
    answer: 'Câu trả lời',
    choose: '— chọn —',
    pickHint: (max: number, picked: number) =>
      `Chọn ${max} đáp án · đã chọn ${picked}/${max}`,
    moveUp: 'Lên',
    moveDown: 'Xuống',
    speaking: (seconds?: number) =>
      `Phần nói${seconds !== undefined ? ` — ${seconds} giây` : ''}. Bản xem trước chưa ghi âm.`,
    charCount: (count: number, max?: number) =>
      `${count}${max !== undefined ? ` / ${max}` : ''} ký tự`,
    explanation: 'Giải thích',
    callouts: { note: 'Lưu ý', example: 'Ví dụ', tip: 'Mẹo' },
    correctAnswer: 'Đáp án đúng',
    correctOrder: 'Thứ tự đúng',
    awaitingGrading: 'Chờ giáo viên chấm',
    manualScore: (score: number, max: number) =>
      `Điểm: ${String(score).replace('.', ',')}/${max}`,
  },
  media: {
    title: 'Thư viện media',
    subtitle:
      'Ảnh, audio và video dùng trong đề thi của trung tâm. Ảnh được chuyển sang WebP khi tải lên.',
    upload: 'Tải lên',
    uploading: 'Đang tải lên…',
    uploadFailed: 'Tải lên thất bại',
    pickFile: 'Chọn file từ máy',
    empty: 'Chưa có file nào.',
    notConfigured: (reason: string) =>
      `Chưa cấu hình Cloudflare R2 (${reason}) nên không tải lên được.`,
    columns: {
      file: 'File',
      kind: 'Loại',
      size: 'Dung lượng',
      uploadedAt: 'Tải lên',
      actions: 'Thao tác',
    },
    kinds: { image: 'Ảnh', audio: 'Audio', video: 'Video' },
    copyUrl: 'Chép URL',
    copied: 'Đã chép URL vào clipboard.',
    copyFailed: 'Không chép được URL.',
    openInNewTab: 'Mở trong tab mới',
    remove: 'Xoá file',
    removeTitle: 'Xoá file media?',
    removeText:
      'File bị xoá khỏi kho lưu trữ. Đề nào đang dùng file này sẽ không hiển thị được nữa.',
    removeFailed: 'Xoá thất bại',
    removed: 'Đã xoá file.',
    insertTitle: {
      image: 'Chèn hình ảnh',
      audio: 'Chèn audio',
      video: 'Chèn video',
    },
    sizeHint: {
      image: (bytes: number) =>
        `Ảnh tối đa ${Math.round(bytes / 1024 / 1024)}MB, tự chuyển sang WebP.`,
      audio: (bytes: number) =>
        `Audio tối đa ${Math.round(bytes / 1024 / 1024)}MB (đủ cho một đề nghe ~30 phút).`,
      video: (bytes: number) =>
        `Video tối đa ${Math.round(bytes / 1024 / 1024)}MB.`,
    },
    orPasteUrl: 'hoặc dán URL',
    insertUrl: 'Chèn URL',
  },
  // Tài liệu nội bộ `/user-manual` (req-2), chỉ System Owner/Admin.
  userManual: {
    title: 'Tài liệu nội bộ',
    backToAdmin: 'Quản trị hệ thống',
    searchPlaceholder: 'Tìm trong tài liệu…',
    allRoles: 'Mọi vai trò',
    resultCount: (count: number) => `${count} trang khớp`,
    noResults: 'Không có trang nào khớp.',
    clearFilters: 'Bỏ lọc',
    toc: 'Trong trang này',
    previous: 'Trang trước',
    next: 'Trang sau',
    appliesTo: 'Áp dụng cho',
    updatedAt: (date: string) => `Cập nhật ${date}`,
    loadFailed: 'Không tải được tài liệu',
    pageNotFound: 'Không tìm thấy trang tài liệu',
    pageNotFoundText: 'Trang này không tồn tại hoặc đã đổi tên.',
    openFirstPage: 'Về trang đầu',
    callout: { info: 'Thông tin', tip: 'Mẹo', warning: 'Lưu ý' },
  },
  notifications: {
    title: 'Thông báo',
    bell: 'Thông báo',
    subtitle: 'Thông báo của mọi trung tâm bạn tham gia, giữ 90 ngày',
    empty: 'Chưa có thông báo nào',
    emptyUnread: 'Không có thông báo chưa đọc',
    markAll: 'Đánh dấu đã đọc tất cả',
    markRead: 'Đánh dấu đã đọc',
    viewAll: 'Tất cả thông báo',
    filterAll: 'Tất cả',
    filterUnread: 'Chưa đọc',
    unread: 'Chưa đọc',
    loadError: 'Không tải được thông báo',
    /** Nhãn chuông khi có thông báo chưa đọc. */
    unreadCount: (count: number) =>
      `${count > 99 ? '99+' : count} thông báo chưa đọc`,
    session: (seq: number | null | undefined) =>
      seq == null ? 'Buổi bù' : `Buổi ${seq}`,
    // Câu chữ của từng loại thông báo (giả định 11: dựng ở client).
    types: {
      class_student_added: (className: string) =>
        `Bạn được thêm vào lớp ${className}`,
      class_teacher_added: (className: string) =>
        `Bạn được phân công dạy lớp ${className}`,
      class_items_assigned: (
        className: string,
        title: string,
        count: number,
      ) =>
        count > 1
          ? `Lớp ${className} có ${count} mục mới: ${title} và ${count - 1} mục khác`
          : `Lớp ${className} có mục mới: ${title}`,
      retake_assigned: (className: string, title: string) =>
        `Lớp ${className} mở lần thi lại: ${title}`,
      class_item_opened: (className: string, title: string) =>
        `Đã tới ngày mở mục ${title} (lớp ${className})`,
      item_deadline_soon: (className: string, title: string, at: string) =>
        `Sắp hết hạn: ${title} (lớp ${className}) hạn ${at}`,
      item_overdue: (className: string, title: string, at: string) =>
        `Quá hạn chưa nộp: ${title} (lớp ${className}), hạn ${at}`,
      attempt_graded: (title: string) => `Bài ${title} đã chấm xong`,
      session_cancelled: (className: string, session: string, at: string) =>
        `${session} lớp ${className} ngày ${at} đã bị huỷ`,
      sessions_moved: (className: string, count: number, at: string) =>
        count > 1
          ? `Lớp ${className} dời ${count} buổi, sớm nhất là ${at}`
          : `Lớp ${className} dời lịch buổi ${at}`,
      session_makeup_added: (className: string, at: string) =>
        `Lớp ${className} có buổi học bù lúc ${at}`,
      session_teacher_assigned: (
        className: string,
        session: string,
        at: string,
      ) => `Bạn được xếp dạy ${session} lớp ${className} ngày ${at}`,
      grading_pending: (title: string, student: string) =>
        student
          ? `${student} vừa nộp bài ${title}, chờ chấm`
          : `Có bài mới cần chấm: ${title}`,
      grading_delegated: (title: string, actor: string) =>
        actor
          ? `${actor} chuyển giao cho bạn chấm: ${title}`
          : `Bạn được chuyển giao chấm: ${title}`,
      class_curriculum_changed: (className: string) =>
        `Giáo trình lớp ${className} vừa được cập nhật`,
      final_comment_published: (className: string) =>
        `Lớp ${className} đã có nhận xét cuối khoá của bạn`,
      // Phụ huynh (Step 13).
      child_item_overdue: (
        child: string,
        className: string,
        title: string,
        at: string,
      ) => `${child} chưa nộp ${title} (lớp ${className}), hạn ${at}`,
      child_attempt_graded: (child: string, title: string) =>
        `Bài ${title} của ${child} đã có kết quả`,
      child_attendance_low: (
        child: string,
        className: string,
        percent: number,
        threshold: number,
      ) =>
        `Chuyên cần của ${child} ở lớp ${className} là ${percent}%, dưới ngưỡng ${threshold}%`,
    },
  },
  nav: {
    overview: 'Tổng quan',
    users: 'Người dùng',
    tenants: 'Trung tâm',
    plans: 'Gói dịch vụ',
    members: 'Thành viên',
    categories: 'Danh mục',
    examBlueprints: 'Loại đề',
    lessonBlueprints: 'Mẫu bài học',
    exams: 'Đề thi',
    lessons: 'Bài học',
    media: 'Thư viện media',
    grading: 'Chấm bài',
    courses: 'Khoá học',
    curricula: 'Giáo trình',
    classes: 'Lớp học',
    schedule: 'Lịch',
    settings: 'Cài đặt',
    userManual: 'Tài liệu nội bộ',
    notifications: 'Thông báo',
    sectionManagement: 'Quản lý',
    sectionExam: 'Đề thi & Bài học',
    sectionTraining: 'Đào tạo',
  },
  theme: {
    label: 'Giao diện',
    current: (name: string) => `Giao diện: ${name}`,
    names: {
      light: 'Sáng',
      'solarized-light': 'Giấy',
      dark: 'Tối',
      system: 'Theo hệ thống',
    },
    hints: {
      light: 'Nền trắng',
      'solarized-light': 'Nền giấy kem',
      dark: 'Nền tối Solarized',
      system: 'Theo cài đặt của máy',
    },
  },
  shell: {
    toggleMenu: 'Mở/đóng menu',
    systemWorkspace: 'Quản trị hệ thống',
    switchWorkspace: 'Chuyển không gian làm việc',
    allWorkspaces: 'Tất cả trong Không gian của tôi',
    notSignedIn: 'Chưa đăng nhập',
  },
  pagination: {
    previous: 'Trang trước',
    next: 'Trang sau',
    pageNumber: 'Số trang',
  },
  stats: {
    users: 'Người dùng',
    tenants: 'Trung tâm',
    pendingTenants: 'Trung tâm chờ duyệt',
    teachers: 'Giáo viên',
    students: 'Học viên',
    parents: 'Phụ huynh',
    memberQuota: 'Thành viên / giới hạn gói',
    exams: 'Đề thi',
    pendingGrading: 'Bài chờ chấm',
  },
} as const;
