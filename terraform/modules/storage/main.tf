resource "aws_s3_bucket" "csv_storage" {
  bucket = "bills-tracker-csv-storage-${random_id.bucket_suffix.id}"
  acl    = "private"

  tags = {
    Name = "CSV Storage"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}