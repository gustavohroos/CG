document.addEventListener("DOMContentLoaded", function () {

    const toggleMenuButton = document.getElementById("toggleMenuButton");
    const buttonsDiv = document.getElementById("buttons");

    toggleMenuButton.addEventListener("click", function () {
        buttonsDiv.classList.toggle("visible"); // Toggle the "visible" class
    });

    const animationTimeInput = document.getElementById("animation-time");
    const startButton = document.getElementById("startButton");
    const stopButton = document.getElementById("stopButton");
    const resetButton = document.getElementById("resetButton");
    const animationStepSlider = document.getElementById("animation-step-slider");
    const animationPercentage = document.getElementById("animation-percentage");
    const radiusSlider = document.getElementById("radius-value-slider");
    const radiusValue = document.getElementById("radius-value");
  
    let animationStep = parseInt(animationStepSlider.value, 10);
  
    animationInterval = animationTimeInput.value;
  
  
  
    startButton.addEventListener("click", function () {
      const totalAnimationTime = parseFloat(animationTimeInput.value) * 1000;
  
      if (isNaN(totalAnimationTime)) {
        alert("Please input the animation time.");
        return;
      }
  
      animationStepSlider.value = 0; // Reset slider to 0
      startAnimation(totalAnimationTime);
    });
  
    stopButton.addEventListener("click", stopAnimation);
  
  
    resetButton.addEventListener("click", resetAnimation);
  
    animationStepSlider.addEventListener("input", function () {
      animationStep = parseInt(animationStepSlider.value, 10);
      animationPercentage.textContent = animationStep + "%"; // Update the displayed percentage
      console.log("Animation step changed:", animationStep);
    });
  
    radiusSlider.addEventListener("input", function () {
      radiusValue.textContent = "Radius: " + radiusSlider.value;
      radius = radiusSlider.value;
    });
  
    function startAnimation(totalAnimationTime) {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
  
      animationPercentage.textContent = "0%";
      animationStepSlider.value = 0;
  
      console.log("Animation started");
  
      const animationStartTime = performance.now();
  
      animationInterval = setInterval(function () {
  
        const currentTime = performance.now() - animationStartTime;
        const progressPercentage = (currentTime / totalAnimationTime) * 100;
  
  
        if (progressPercentage >= 100) {
          clearInterval(animationInterval);
          console.log("Animation completed");
          return;
        }
  
        animationPercentage.textContent = progressPercentage.toFixed(0) + "%";
        animationStepSlider.value = progressPercentage;
      }, 16); // Update every 16ms for smoothness
    }
  
    function stopAnimation() {
      animationRunning = false;
      clearInterval(animationInterval);
      animationPercentage.textContent = "0%";
      animationStepSlider.value = 0; // Reset slider value
  
      console.log("Animation stopped");
    }
  
    function resetAnimation() {
      clearInterval(animationInterval);
      animationTimeInput.value = "";
      animationStepSlider.value = 0; // Reset slider value
      animationPercentage.textContent = "0%";
      radiusSlider.value = 50;
      radiusValue.textContent = "Radius: " + radiusSlider.value;
      console.log("Animation reset");
    }

});