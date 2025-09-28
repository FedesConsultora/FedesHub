const driverDefault = (process.env.STORAGE_DRIVER || 'local').toLowerCase()

const cfg = {
  driverDefault,
  chatDriver:   (process.env.CHAT_STORAGE_DRIVER   || driverDefault).toLowerCase(),
  tareasDriver: (process.env.TAREAS_STORAGE_DRIVER || driverDefault).toLowerCase(),

  baseDir:   process.env.STORAGE_BASE_DIR   || 'uploads',
  publicBase:process.env.STORAGE_PUBLIC_BASE || '/uploads',

  drive: {
    credentials: process.env.GDRIVE_CREDENTIALS_JSON && JSON.parse(process.env.GDRIVE_CREDENTIALS_JSON),
    sharedDriveId:  process.env.DRIVE_SHARED_DRIVE_ID || undefined,
    baseFolderId:   process.env.DRIVE_BASE_FOLDER_ID  || undefined,
    baseFolderName: process.env.DRIVE_BASE_FOLDER_NAME || 'FedesHub',
    shareMode: (process.env.DRIVE_SHARE_MODE || 'inherit').toLowerCase(),
    domain: process.env.DRIVE_DOMAIN || undefined
  }
}

export default cfg
