export class ThrowIndicator {
    constructor({THREE, scene}) {
    }
    update(start, end) {
    }
}

export class TimeIndicator {
    constructor({THREE, scene, config}) {
        this.uProgress = {
            value: 0
        }
        this.plane = new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.ShaderMaterial({
            vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = (position.xy+.5);
                mat4 tvm = viewMatrix;//transpose(viewMatrix);
                float aspect = length(projectionMatrix[0].xyz)/length(projectionMatrix[1].xyz);
                vec3 npos = position*vec3(aspect,1.,1.)*.1;
            	gl_Position = vec4(npos,1.);//projectionMatrix * modelViewMatrix * vec4( npos, 1.0 );
            }
            `,
            fragmentShader: `
            varying vec2 vUv;
            uniform float uProgress;
            void main(){
              vec2 circ=vUv-.5;
             // if(length(circ)>.5)discard;
              float ang = ((atan(-circ.x,-circ.y)/3.1415926)+1.)*.5;
              float progAng = uProgress*10.;
              float alpha = smoothstep(ang,ang+.1,progAng);
              //if(ang>progAng)discard;
              alpha *= smoothstep(.5,.4,length(circ));
              gl_FragColor = vec4(vec3(smoothstep(progAng-ang,1.,3.)),alpha);
            }
            `,
            transparent:true,
            uniforms: {
                uProgress: this.uProgress
            }
        }))
        this.plane.rotation.x = -Math.PI * .5;
        this.plane.position.y += .25;
        this.config = config;
        scene.add(this.plane)
    }
    update(progress=(performance.now() / 30000) % 1) {
        this.uProgress.value = progress;
        this.plane.visible = (this.uProgress.value < 1.) ? true : false;
        if(this.plane.visible)
            this.config.refuelRenderer();
        this.plane.material.uniformsNeedUpdate = true;
    }
}
