<?php
$themeClass = '';
if (!empty($_COOKIE['theme']) && $_COOKIE['theme'] == 'dark') {
  $themeClass = 'dark-theme';
}
?>
 
<!DOCTYPE html>
<html lang="en">
<!-- etc. -->
<body class="<?php echo $themeClass; ?>">
<!-- etc. -->
</body>
</html>
