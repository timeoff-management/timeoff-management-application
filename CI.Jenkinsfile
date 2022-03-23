#!/usr/bin/env groovy

def ci = "tfpod-${UUID.randomUUID().toString()}"

podTemplate(
  label: ci,
  volumes: [
      hostPathVolume(hostPath: '/var/run/docker.sock', mountPath: '/var/run/docker.sock')
  ],
  containers: [
    containerTemplate(name: 'docker', image: "docker:20.10.13-alpine3.15", ttyEnabled: true, alwaysPullImage: false, command: 'cat'),
    containerTemplate(name: 'kubeval', image: "garethr/kubeval:0.15.0", ttyEnabled: true, alwaysPullImage: false, command: 'cat'),
    containerTemplate(name: 'kustomize',image: "k8s.gcr.io/kustomize/kustomize:v3.8.7", ttyEnabled: true, alwaysPullImage: false, command: 'cat'),
  ]
) {
  timeout(60){
    timestamps {
      ansiColor('xterm') {
        node(ci) {
          try {
            container('kustomize') {
              stage('Git checkout') {
                checkout scm
              }
              stage('CI - Generate K8s manifests from templates') {
                dir("k8s"){
                  sh("/app/kustomize build overlays/dev > app.yaml")
                }
              } // stage end
            }
            container('kubeval') {
              stage('CI - Validate K8s manifests') {
                sh("/kubeval --ignore-missing-schemas k8s/*.yaml")
              } // stage end
            }
            container('docker') {
              stage('CI - Build image & Run Tests') {
                sh("docker build --target=ready --tag dperezro/timeoff:ci .")
              } // stage end
            }
          } catch(err) {
            if (err.toString().contains('FlowInterruptedException')) {
              currentBuild.result = 'UNSTABLE'
              echo "Pipeline Aborted/Timed Out"
            } else {
              currentBuild.result = 'FAILURE'
              echo """
                Pipeline failed. Please see error information below:

                ${err}

              """.stripIndent()
            }
          } finally {}
        }
      }
    }
  }
}
