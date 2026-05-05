resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0" # Example AMI ID, adjust for your region
  instance_type = "t2.micro"
  subnet_id     = module.networking.public_subnet_id
  security_groups = [module.networking.app_sg_id]

  tags = {
    Name = "app-instance"
  }
}
