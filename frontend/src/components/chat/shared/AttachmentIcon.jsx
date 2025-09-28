import {
  FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint,
  FaFileAlt, FaFileImage, FaFileVideo, FaFileAudio,
  FaFileArchive, FaCode, FaRegFile
} from 'react-icons/fa'

const byMime = [
  [/^image\//,        FaFileImage],
  [/^video\//,        FaFileVideo],
  [/^audio\//,        FaFileAudio],
  [/^application\/pdf$/, FaFilePdf],
  [/^application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml)/, FaFileWord],
  [/^application\/(vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml)/, FaFileExcel],
  [/^application\/(vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.presentationml)/, FaFilePowerpoint],
  [/^text\/(csv|plain)/, FaFileAlt],
  [/^application\/(zip|x-7z-compressed|x-rar-compressed|x-tar)/, FaFileArchive],
  [/^application\/(json|xml)$/ , FaCode],
]

const byExt = [
  [/\.pdf$/i, FaFilePdf],
  [/\.(doc|docx)$/i, FaFileWord],
  [/\.(xls|xlsx|xlsm|csv)$/i, FaFileExcel],
  [/\.(ppt|pptx)$/i, FaFilePowerpoint],
  [/\.(png|jpg|jpeg|gif|webp|avif|svg)$/i, FaFileImage],
  [/\.(mp4|mov|mkv|webm)$/i, FaFileVideo],
  [/\.(mp3|wav|ogg|m4a)$/i, FaFileAudio],
  [/\.(zip|7z|rar|tar|gz)$/i, FaFileArchive],
  [/\.(json|xml|yml|yaml|html|css|js|ts)$/i, FaCode],
]

export default function AttachmentIcon({ mime='', name='' }){
  const m = byMime.find(([re]) => re.test(mime))?.[1]
  if (m) return <>{m()}</>
  const e = byExt.find(([re]) => re.test(name))?.[1]
  const Icon = e || FaRegFile
  return <Icon />
}
