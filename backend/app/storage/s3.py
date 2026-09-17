import uuid

from app.storage.base import StorageService


class S3Storage(StorageService):
    """AWS-ready storage backend. Not exercised in local dev — activate by setting
    STORAGE_BACKEND=s3, S3_BUCKET and AWS_REGION once the bucket exists. Credentials
    are never read from config: boto3 picks them up from the environment or, in
    production, from the EC2 instance's IAM role.
    """

    def __init__(self, bucket: str, region: str):
        self.bucket = bucket
        self.region = region
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import boto3

            self._client = boto3.client("s3", region_name=self.region or None)
        return self._client

    def save(self, data: bytes, filename: str) -> str:
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
        key = f"recognitions/{uuid.uuid4().hex}.{ext}"
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=f"image/{ext}")
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"

    def delete(self, url: str) -> None:
        key = url.split(f"{self.bucket}.s3.{self.region}.amazonaws.com/", 1)[-1]
        self.client.delete_object(Bucket=self.bucket, Key=key)
