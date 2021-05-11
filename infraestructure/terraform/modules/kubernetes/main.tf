provider "kubernetes" {
  host                   = var.host
  client_certificate     = var.client_certificate
  client_key             = var.client_key
  cluster_ca_certificate = var.cluster_ca_certificate
}


resource "kubernetes_config_map" "nginx-conf" {
  metadata {
    name = "nginx-conf"
  }

  data = {
    "web.conf" = <<-EOT
    server {
       listen 80;
       server_name *.azure.com;
       location / {
         return 301 https://$host$request_uri;
       }
       location /.well-known/acme-challenge/ {
         root /var/www/certbot;
       }
    }
    server {
      listen 443 ssl;
      server_name ${var.ui_fqdn};
      location / {
        proxy_pass http://timeoff:3000;
      }
      ssl_certificate /etc/letsencrypt/live/${var.ui_fqdn}/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/${var.ui_fqdn}/privkey.pem;
      include /etc/letsencrypt/options-ssl-nginx.conf;
      ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    }
    EOT
  }
}
resource "kubernetes_secret" "docker_login" {
  metadata {
    name = "privatehub"
  }

  data = {
    ".dockerconfigjson" = <<DOCKER
{
  "auths": {
    "${var.registry_server}": {
      "auth": "${base64encode("${var.registry_username}:${var.registry_password}")}"
    }
  }
}
DOCKER
  }

  type = "kubernetes.io/dockerconfigjson"
}

resource "kubernetes_storage_class" "my-azurefile" {
  metadata {
    name = "my-azurefile"
  }
  storage_provisioner = "kubernetes.io/azure-file"
  parameters = {
    skuName = "Standard_LRS"
  }
  mount_options = ["file_mode=0666", "dir_mode=0666", "mfsymlinks", "uid=1000", "gid=1000", "nobrl", "cache=none"]
}

resource "kubernetes_persistent_volume_claim" "my-azurefile" {
  metadata {
    name = "my-azurefile"
  }
  spec {
    access_modes = ["ReadWriteMany"]
    storage_class_name = "my-azurefile"
    resources {
      requests = {
        storage = "100Mi"
      }
    }
    #volume_name = "${kubernetes_persistent_volume.my-azurefile.metadata.0.name}"
  }
}

#creation of pod and services 

resource "kubernetes_deployment" "nginx" {
  depends_on = [
    kubernetes_config_map.nginx-conf,
  ]
  metadata {
    name = "nginx"
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "nginx"
      }
    }

    template {
      metadata {
        labels = {
          app = "nginx"
        }
      }

      spec {
        volume {
          name = "conf"
          config_map{
            name = "nginx-conf"
          }
        }
        volume{
          name = "volume"
          persistent_volume_claim{
            claim_name = "my-azurefile"
          }
        }
        volume{
          name = "certbot"
          empty_dir{}
        }
        container {
          name  = "nginx"
          image = "nginx:1.15-alpine"
          args = ["/bin/sh", "-c", "apk add inotify-tools && inotifywait -r -m -e delete_self /etc/letsencrypt/live/${var.ui_fqdn} | while read path _ file; do echo \"file deleted\"; sleep 60; nginx -s reload; done & while :; do sleep 6h & wait $${!}; nginx -s reload; done & nginx -g \"daemon off;\"" ]

          port {
            container_port = 443
          }
          port {
            container_port = 80
          }
          volume_mount{
            name = "conf"
            mount_path = "/etc/nginx/conf.d/web.conf"
            sub_path = "web.conf"
          }    
          volume_mount{
            name = "volume"
            mount_path = "/etc/letsencrypt"
            sub_path = "letsencrypt"
          }
          volume_mount{
            name = "certbot"
            mount_path = "/var/www/certbot"
          }
        }
        container{
          name  = "certbot"
          image = "certbot/certbot"
          command = ["sh", "-c", "rm -Rf /etc/letsencrypt/live/${var.ui_fqdn} && rm -Rf /etc/letsencrypt/archive/${var.ui_fqdn} && rm -Rf /etc/letsencrypt/renewal/${var.ui_fqdn}.conf && certbot certonly --webroot -w /var/www/certbot --register-unsafely-without-email -d ${var.ui_fqdn} --rsa-key-size 4096 --agree-tos --force-renewal && trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;"]
          volume_mount{
            name = "volume"
            mount_path = "/etc/letsencrypt"
            sub_path = "letsencrypt"
          }
          volume_mount{
            name = "certbot"
            mount_path = "/var/www/certbot"
          }
        }
        init_container{
        image = "alpine"
        name = "dir-creator"
        command = ["/bin/sh", "-c", "mkdir -p /exports/letsencrypt && touch /exports/db.development.sqlite"]
        volume_mount{
            name = "volume"
            mount_path = "/exports"
          }  
        }    
        init_container{
          name  = "setup"
          image = "certbot/certbot"
          command = ["sh", "-c", " apk add curl && curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > /etc/letsencrypt/options-ssl-nginx.conf && curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > /etc/letsencrypt/ssl-dhparams.pem && mkdir -p /etc/letsencrypt/live/${var.ui_fqdn} && openssl req -x509 -nodes -newkey rsa:1024 -days 1 -keyout /etc/letsencrypt/live/${var.ui_fqdn}/privkey.pem -out /etc/letsencrypt/live/${var.ui_fqdn}/fullchain.pem -subj /CN=localhost "]
          volume_mount{
            name = "volume"
            mount_path = "/etc/letsencrypt"
            sub_path = "letsencrypt"
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "nginx" {
  metadata {
    name = "nginx"
  }

  spec {
    port {
      name = "http"
      port = 80
    }
    port {
      name = "https"
      port = 443
    }

    selector = {
      app = "nginx"
    }

    type             = "LoadBalancer"
    load_balancer_ip = var.ui_public_ip
  }
}


resource "kubernetes_deployment" "timeoff" {
    depends_on = [
    kubernetes_secret.docker_login,
    kubernetes_deployment.nginx,
  ]
  metadata {
    name = "timeoff"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "timeoff"
      }
    }

    template {
      metadata {
        labels = {
          app = "timeoff"
        }
      }

      spec {
        volume{
          name = "web"
          persistent_volume_claim{
            claim_name = "my-azurefile"
          }
        }
        container {
          name  = "timeoff"
          image = "docker.pkg.github.com/myronmd26/timeoff-management-application/timeoff:latest"
          volume_mount{
            name = "web"
            mount_path = "/app/timeoff-management/db.development.sqlite"
            sub_path = "db.development.sqlite"
          }
          port {
            container_port = 3000
          }
        }
        image_pull_secrets {
          name = "privatehub"
        }
      }
    }
  }
}

resource "kubernetes_service" "timeoff" {
  metadata {
    name = "timeoff"
  }

  spec {
    port {
      port = 3000
    }

    selector = {
      app = "timeoff"
    }
  }
}
