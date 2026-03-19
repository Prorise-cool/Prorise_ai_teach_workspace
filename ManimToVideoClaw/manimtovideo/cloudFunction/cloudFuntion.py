import os
import requests
from oss2 import SizedFileAdapter, determine_part_size
from oss2.models import PartInfo
import oss2
from oss2.credentials import EnvironmentVariableCredentialsProvider
from tempfile import NamedTemporaryFile  

# 从环境变量中获取访问凭证。请确保已设置环境变量OSS_ACCESS_KEY_ID和OSS_ACCESS_KEY_SECRET。
auth = oss2.ProviderAuth(EnvironmentVariableCredentialsProvider())
bucket = oss2.Bucket(auth, 'https://oss.scenext.cn', 'scenext',is_cname=True)
       

# 通过URL将文件上传到阿里云的OSS
def upload_file_to_aliyunOSS(url,cloud_path):

    # 填写不能包含Bucket名称在内的Object完整路径，例如exampledir/exampleobject.txt。
    key = cloud_path
    
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length'))
    # determine_part_size方法用于确定分片大小。
    part_size = determine_part_size(total_size, preferred_size=100 * 1024)

    # 初始化分片。
    headers = dict()
    headers['x-oss-forbid-overwrite'] = 'true'
    upload_id = bucket.init_multipart_upload(key, headers=headers).upload_id

    parts = []

    # 逐个上传分片。
    part_number = 1
    offset = 0
    while offset < total_size:
        num_to_upload = min(part_size, total_size - offset)
        result = bucket.upload_part(key, upload_id, part_number,
                                    SizedFileAdapter(response.raw, num_to_upload))
        parts.append(PartInfo(part_number, result.etag))

        offset += num_to_upload
        part_number += 1

    # 完成分片上传。
    bucket.complete_multipart_upload(key, upload_id, parts)

    # 生成下载文件的签名URL，有效时间为86400秒（1天）。
    # 设置slash_safe为True，OSS不会对Object完整路径中的正斜线（/）进行转义，此时生成的签名URL可以直接使用。
    aliyunOSSurl = bucket.sign_url('GET', key, 86400, slash_safe=True)
    
    return aliyunOSSurl

def file_OSSexist(cloud_path):
    return bucket.object_exists(cloud_path)

    
def download_OSSfile(cloud_path,local_path):
    bucket.get_object_to_file(cloud_path, local_path)


def upload_filePath_to_aliyunOSS(file_Path,cloud_path,forbid_overwrite:str='false'):
    # 填写不能包含Bucket名称在内的Object完整路径，例如exampledir/exampleobject.txt。
    key = cloud_path

    total_size = os.path.getsize(file_Path)

    part_size = determine_part_size(total_size, preferred_size=100 * 1024)
    # 初始化分片。
    headers = dict()
    # 指定过期时间，单位为毫秒。
    # headers['Expires'] = '604800000' # 7天
    headers['x-oss-forbid-overwrite'] = forbid_overwrite
    upload_id = bucket.init_multipart_upload(key, headers=headers).upload_id

    parts = []

    # 逐个上传分片。
    with open(file_Path, 'rb') as fileobj:
        part_number = 1
        offset = 0
        while offset < total_size:
            num_to_upload = min(part_size, total_size - offset)
            # 调用SizedFileAdapter(fileobj, size)方法会生成一个新的文件对象，重新计算起始追加位置。
            result = bucket.upload_part(key, upload_id, part_number,
                                        SizedFileAdapter(fileobj, num_to_upload))
            parts.append(PartInfo(part_number, result.etag))

            offset += num_to_upload
            part_number += 1

    # 完成分片上传。
    bucket.complete_multipart_upload(key, upload_id, parts)

    # 生成下载文件的签名URL，有效时间为604800秒（7天）。
    # 设置slash_safe为True，OSS不会对Object完整路径中的正斜线（/）进行转义，此时生成的签名URL可以直接使用。
    # aliyunOSSurl = bucket.sign_url('GET', key, 604800, slash_safe=True)
    aliyunOSSurl = f"https://oss.scenext.cn/{cloud_path}"
    return aliyunOSSurl

# 提供文件二进制流上传到阿里云
def upload_fileByte_to_aliyunOSS(file_content, filename):  
    key = f'VIP/{filename}'  
      
    # 将文件内容写入临时文件  
    with NamedTemporaryFile(delete=True) as temp_file:  
        temp_file.write(file_content)  
        temp_file.flush()  
          
        # 使用oss2上传文件  
        bucket.put_object_from_file(key, temp_file.name)  
  
    # 生成下载文件的签名URL，有效时间为180天  
    aliyunOSSurl = bucket.sign_url('GET', key, 15552000, slash_safe=True)  
    return aliyunOSSurl  

