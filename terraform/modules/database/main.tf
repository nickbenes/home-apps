resource "aws_db_instance" "postgres" {
  allocated_storage    = 20
  engine               = "postgres"
  instance_class       = "db.t2.micro"
  name                 = "bills_tracker_db"
  username             = "admin"
  password             = "password123" # Change this to a secure value
  parameter_group_name = "default.postgres12"
}
